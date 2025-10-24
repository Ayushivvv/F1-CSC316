import requests
import pandas as pd
from pathlib import Path

BASE_URL = "https://api.openf1.org/v1"

# === Save helper ===
def save_to_data(df: pd.DataFrame, filename: str):
    root_data = Path(__file__).resolve().parent.parent / "data" / "openf1_data"
    root_data.mkdir(parents=True, exist_ok=True)
    filepath = root_data / filename
    df.to_csv(filepath, index=False)
    print(f" Saved: {filepath}")

# === Fetch wrapper ===
def fetch_data(endpoint: str, params: dict = None):
    url = f"{BASE_URL}/{endpoint}"
    r = requests.get(url, params=params)
    r.raise_for_status()
    df = pd.DataFrame(r.json())
    return df

# === Get session keys ===
def get_session(year: int, country: str, session_type: str):
    sessions = fetch_data("sessions", {
        "year": year,
        "country_name": country,
        "session_type": session_type
    })
    if sessions.empty:
        raise ValueError(f"No sessions found for {year} {country} ({session_type}). Try 2023 or 2024.")

    session_key = sessions.iloc[0]["session_key"]
    meeting_key = sessions.iloc[0]["meeting_key"]
    print(f"Found session: {country} {year} {session_type} (session_key={session_key}, meeting_key={meeting_key})")
    return session_key, meeting_key

# === Collect race data ===
def collect_openf1(year: int, country: str, session_type: str, driver_number: int = None):
    session_key, meeting_key = get_session(year, country, session_type)

    # --- Results ---
    results = fetch_data("session_result", {"session_key": session_key})
    save_to_data(results, f"{country.lower()}_{year}_{session_type.lower()}_results.csv")

    # --- Starting Grid ---
    grid = fetch_data("starting_grid", {"session_key": session_key})
    save_to_data(grid, f"{country.lower()}_{year}_{session_type.lower()}_grid.csv")

    # --- Weather ---
    weather = fetch_data("weather", {"meeting_key": meeting_key})
    save_to_data(weather, f"{country.lower()}_{year}_{session_type.lower()}_weather.csv")

    # --- Driver Lap Data (if chosen) ---
    if driver_number:
        laps = fetch_data("laps", {"session_key": session_key, "driver_number": driver_number})
        save_to_data(laps, f"{country.lower()}_{year}_{session_type.lower()}_{driver_number}_laps.csv")

    print("Done! Data saved.")

# === Example run ===
# if __name__ == "__main__":
    # Example: Belgian GP 2023 Race (driver Verstappen = 33)
    #collect_openf1(2023, "Belgium", "Race", driver_number=33)