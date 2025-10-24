import fastf1
import pandas as pd
from pathlib import Path

# === Save helper (into existing FastF1 data folder) ===
def save_to_data(df: pd.DataFrame, filename: str):
    # Go one folder up from /scripts to reach project root, then into /data/fastf1_data
    root_data = Path(__file__).resolve().parent.parent / "data" / "fastf1_data"
    root_data.mkdir(parents=True, exist_ok=True)  # make sure it exists
    filepath = root_data / filename
    df.to_csv(filepath, index=False)
    print(f"Saved: {filepath}")


# === Main function ===
def collect_race(year: int, gp_name: str, session_type: str = "R", driver_code: str = None):
    """
    year         -> e.g. 2023
    gp_name      -> e.g. "Belgian", "Monaco", "Italian"
    session_type -> "R" (Race), "Q" (Qualifying), "FP1"/"FP2"/"FP3" (Practice)
    driver_code  -> optional 3-letter driver code (e.g. "HAM", "VER", "LEC").
                    If provided, saves lap data for that driver.
    """

    # Load session
    session = fastf1.get_session(year, gp_name, session_type)
    session.load()

    # --- Race Results ---
    results = session.results[["Abbreviation", "Position", "Points", "Status"]]
    print("\n=== Race Results ===")
    print(results.head())
    save_to_data(results, f"{gp_name.lower()}_{year}_results.csv")

    # --- Driver Lap Data ---
    if driver_code:
        try:
            driver_laps = session.laps.pick_driver(driver_code)
            lap_data = driver_laps[["LapNumber", "LapTime", "Sector1Time", "Sector2Time", "Sector3Time"]]
            print(f"\n=== {driver_code} Lap Data (first 5 laps) ===")
            print(lap_data.head())
            save_to_data(lap_data, f"{gp_name.lower()}_{year}_{driver_code.lower()}_laps.csv")
        except KeyError:
            print(f"Driver code '{driver_code}' not found in this session.")

    # --- Weather Data ---
    weather = session.weather_data[["AirTemp", "Humidity", "Rainfall", "TrackTemp"]].reset_index(drop=True)
    print("\n=== Weather Sample ===")
    print(weather.head())
    save_to_data(weather, f"{gp_name.lower()}_{year}_weather.csv")


# Sample Test call:
#if __name__ == "__main__":
    # Example usage: Belgian GP 2023 Race for Hamilton
    #collect_race(2023, "Belgian", "R", driver_code="HAM")