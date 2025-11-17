from __future__ import annotations
from datetime import datetime
import fastf1
import pandas as pd
from pathlib import Path
import json
from pathlib import Path


# ======================================================
# Path helpers
# ======================================================

def _project_root() -> Path:
    """Assumes this file lives in <project_root>/scripts/."""
    return Path(__file__).resolve().parent.parent


def _fastf1_data_dir() -> Path:
    """data/fastf1_data inside the project root."""
    return _project_root() / "data" / "fastf1_data"


# ======================================================
# Save helpers
# ======================================================

def save_to_data(df: pd.DataFrame, filename: str) -> Path:
    """
    Save DataFrame as CSV inside data/fastf1_data.
    """
    out_dir = _fastf1_data_dir()
    out_dir.mkdir(parents=True, exist_ok=True)
    filepath = out_dir / filename
    df.to_csv(filepath, index=False)
    print(f"[CSV]  {filepath}")
    return filepath


def save_json_to_data(df: pd.DataFrame, filename: str) -> Path:
    """
    Save DataFrame as JSON (records) inside data/fastf1_data.
    """
    out_dir = _fastf1_data_dir()
    out_dir.mkdir(parents=True, exist_ok=True)
    filepath = out_dir / filename
    df.to_json(filepath, orient="records", date_format="iso")
    print(f"[JSON] {filepath}")
    return filepath


# ======================================================
# Utilities
# ======================================================

def sanitize_event_name(event_name: str) -> str:
    """
    Convert 'Australian Grand Prix' -> 'australian_grand_prix'
    to make nice filenames.
    """
    return event_name.strip().lower().replace(" ", "_")


def json_exists(year: int, event_name: str, session_type: str) -> bool:
    """
    Check if we already exported this race JSON.
    Allows re-running without losing any existing data.
    """
    base_name = f"{year}_{sanitize_event_name(event_name)}_{session_type.lower()}_grid_finish.json"
    return (_fastf1_data_dir() / base_name).exists()


# ======================================================
# Single-race exporter (grid vs finish for viz3)
# ======================================================

def collect_grid_vs_finish(
        year: int,
        gp_name: str,
        session_type: str = "R",
        overwrite: bool = False,
) -> None:
    """
    Export a single race (or qualifying/sprint if you pass a different session_type)
    into CSV + JSON for the front-end visualization.

    year         -> e.g. 2023
    gp_name      -> e.g. "Belgian Grand Prix", "Monaco Grand Prix"
    session_type -> "R" (Race), "Q" (Qualifying), "S" (Sprint), "SQ", etc.
    overwrite    -> if False, skip if JSON already exists.
    """
    if not overwrite and json_exists(year, gp_name, session_type):
        print(f"   ↷ Skipping {year} {gp_name} ({session_type}) – JSON already exists.")
        return

    print(f"\n=== {year} {gp_name} ({session_type}) ===")

    # Load the session from FastF1 (this will use cache if available)
    session = fastf1.get_session(year, gp_name, session_type)
    session.load()

    results = session.results.copy()

    # Columns we care about for the viz
    wanted_cols = [
        "Abbreviation",
        "FullName",
        "TeamName",
        "TeamColor",
        "GridPosition",
        "Position",
        "Status",
        "Time",
        "Points",
        "HeadshotUrl",
    ]
    cols_present = [c for c in wanted_cols if c in results.columns]
    race_df = results[cols_present].copy()

    race_df["Year"] = year
    race_df["Circuit"] = gp_name
    race_df["Session"] = session_type

    base_name = f"{year}_{sanitize_event_name(gp_name)}_{session_type.lower()}_grid_finish"

    save_to_data(race_df, base_name + ".csv")
    save_json_to_data(race_df, base_name + ".json")


# ======================================================
# All-races exporter (for a range of years)
# ======================================================

def collect_all_grid_vs_finish(
        start_year: int = 2018,
        end_year: int | None = None,
        session_types: tuple[str, ...] = ("R",),
        overwrite: bool = False,
) -> None:
    """
    Loops over all years from start_year to end_year (inclusive),
    uses FastF1's event schedule, and exports sessions for each event.

    - By default, only the RACE ('R') is exported.
    - Set overwrite=True if you ever want to regenerate files.
    - Existing JSONs are left untouched (just skipped) when overwrite=False.
    """
    if end_year is None:
        end_year = datetime.now().year

    today = pd.Timestamp.today().normalize()

    print(f"Exporting all races from {start_year} to {end_year}…")

    for year in range(start_year, end_year + 1):
        print(f"\n--- Season {year} ---")

        try:
            # include_testing=False skips test events
            schedule = fastf1.get_event_schedule(year, include_testing=False)
        except Exception as e:
            print(f"!! Could not get schedule for {year}: {e}")
            continue

        for _, event in schedule.iterrows():
            gp_name = event.get("EventName")
            if not isinstance(gp_name, str) or not gp_name.strip():
                continue

            # Optional: skip future events that haven't happened yet
            event_date = event.get("EventDate")
            if isinstance(event_date, pd.Timestamp) and event_date > today:
                continue

            for sess in session_types:
                try:
                    collect_grid_vs_finish(
                        year=year,
                        gp_name=gp_name,
                        session_type=sess,
                        overwrite=overwrite,
                    )
                except Exception as e:
                    print(f"   !! Failed {year} {gp_name} ({sess}): {e}")


# ======================================================
# Script entry point
# ======================================================

if __name__ == "__main__":
    # Ensure cache folder exists & enable caching for FastF1
    cache_dir = _project_root() / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(cache_dir)

    # EXAMPLES – pick one pattern you like:

    # 1) Main: export all races from 2018 up to current year, races only,
    #    skipping any events you've already saved:
    collect_all_grid_vs_finish(start_year=2018, end_year=None, session_types=("R",), overwrite=False)

    # 2) (Optional) If you ever want to force-rebuild just a slice:
    # collect_all_grid_vs_finish(start_year=2021, end_year=2023, session_types=("R",), overwrite=True)

    # 3) (Optional) Test exporting just a single known race:
    # collect_grid_vs_finish(2023, "Belgian Grand Prix", session_type="R", overwrite=True)

# ======================================================
# Organize the sessions for easier retrieval
# ======================================================

def build_sessions_index():
    """
    Scan data/fastf1_data for *grid_finish.json files and build an index
    for the frontend, like:
    [
      {
        "year": 2020,
        "gp": "Belgian Grand Prix",
        "label": "2020 Belgian Grand Prix – Race",
        "file": "data/fastf1_data/2020_belgian_grand_prix_r_grid_finish.json"
      },
      ...
    ]
    """
    root = Path(__file__).resolve().parent.parent
    data_dir = root / "data" / "fastf1_data"

    sessions = []

    for fp in data_dir.glob("*_r_grid_finish.json"):
        name = fp.name  # e.g. '2020_belgian_grand_prix_r_grid_finish.json'

        # pattern: YYYY_<event>_r_grid_finish.json
        parts = name.split("_")
        if len(parts) < 4:
            continue

        try:
            year = int(parts[0])
        except ValueError:
            continue

        # everything between year and '_r_grid_finish' is the event name
        event_slug = "_".join(parts[1:-3]) if len(parts) > 4 else parts[1]
        event_slug = "_".join(parts[1:-3]) if name.endswith("_grid_finish.json") else "_".join(parts[1:-2])
        # safer: strip tail manually
        base = name.replace(".json", "")
        # remove "<year>_" prefix and "_r_grid_finish" suffix
        base_core = base[len(str(year)) + 1:]
        event_slug = base_core.replace("_r_grid_finish", "")

        event_pretty = event_slug.replace("_", " ").title()
        label = f"{year} {event_pretty} – Race"

        sessions.append({
            "year": year,
            "gp": event_pretty,  # human-readable event name
            "label": label,
            "file": f"data/fastf1_data/{name}"
        })

    # sort nicely: by year, then by label
    sessions.sort(key=lambda d: (d["year"], d["label"]))

    out_path = data_dir / "sessions_index.json"
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(sessions, f, indent=2, ensure_ascii=False)

    print(f"[INDEX] Wrote {out_path}")


if __name__ == "__main__":
    cache_dir = _project_root() / "cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    fastf1.Cache.enable_cache(cache_dir)

    collect_all_grid_vs_finish(start_year=2018, end_year=None, session_types=("R",), overwrite=False)

    # Build/update index after exporting data
    build_sessions_index()