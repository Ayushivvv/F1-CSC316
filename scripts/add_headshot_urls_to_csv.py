import pandas as pd
import glob
import os
# GETTING DRIVER HEADSHOTS
input_folder_path = "../data/fastf1_data"

csv_files = glob.glob(os.path.join(input_folder_path, "*.csv"))

print(f"Found {len(csv_files)} CSV files.")

dfs = []
columns_to_extract = ["Abbreviation", "FullName", "TeamColor", "HeadshotUrl"]

for file in csv_files:
    try:
        df = pd.read_csv(file)
        existing_cols = [col for col in columns_to_extract if col in df.columns]
        if existing_cols:
            df_subset = df[existing_cols]
            dfs.append(df_subset)
        else:
            print(f"Skipping {file}: no matching columns found.")
    except pd.errors.EmptyDataError:
        print(f"Skipping {file}: file is empty or invalid.")

if dfs:
    combined_df = pd.concat(dfs, ignore_index=True)

    if 'Abbreviation' in combined_df.columns:
        initial_count = len(combined_df)
        combined_df = combined_df.drop_duplicates(subset="Abbreviation")
        print(f"Dropped {initial_count - len(combined_df)} duplicates.")

    if 'HeadshotUrl' in combined_df.columns:
        pre_drop_count = len(combined_df)
        combined_df = combined_df.dropna(subset=['HeadshotUrl'])
        print(f"Removed {pre_drop_count - len(combined_df)} rows with empty HeadshotUrl.")
        print(f"Final driver count: {len(combined_df)}")

    output_path = "../data/driver_headshots_combined.csv"

    combined_df.to_csv(output_path, index=False)
    print(f"Combined CSV saved as {output_path}")
else:
    print("No valid data found in CSV files.")