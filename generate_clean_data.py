import pandas as pd
import sys

# --- Configuration ---
# Make sure these match the filenames you uploaded to Replit
TRACKMAN_CUSTOMERS_FILE = 'trackmancustomers.csv'
BOOKING_REPORT_FILE = 'basic-booking-report.csv'
PURCHASE_REPORT_FILE = 'purchase-report.csv'
MINDBODY_REPORT_FILE = 'mindbody-report.csv'
OUTPUT_FILE = 'even_house_cleaned_member_data.csv'

def clean_data():
    print("Loading files...")
    try:
        # Load datasets (using latin1 to handle legacy system exports)
        df_tm = pd.read_csv(TRACKMAN_CUSTOMERS_FILE, encoding='latin1')
        df_bookings = pd.read_csv(BOOKING_REPORT_FILE, encoding='latin1')
        df_mb = pd.read_csv(MINDBODY_REPORT_FILE, encoding='latin1')
    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("Please ensure you have uploaded all 4 CSV files and renamed them correctly.")
        return

    # --- 1. Prepare Mindbody Data (Source of Truth) ---
    print("Preparing Mindbody data...")
    df_mb['Email Address'] = df_mb['Email Address'].astype(str).str.lower().str.strip()
    df_mb['Client Name'] = df_mb['Client Name'].astype(str).str.strip()

    # Split names for matching
    df_mb[['first_name', 'last_name']] = df_mb['Client Name'].apply(
        lambda x: pd.Series(x.split(' ', 1) if ' ' in x else [x, ''])
    )
    df_mb['normalized_key'] = (df_mb['first_name'] + df_mb['last_name']).str.lower().str.replace(r'[^a-z]', '', regex=True)

    # --- 2. Prepare Trackman Data ---
    print("Preparing Trackman data...")
    df_tm['email'] = df_tm['email'].astype(str).str.lower().str.strip()
    df_tm['normalized_key'] = (df_tm['firstName'] + df_tm['lastName']).str.lower().str.replace(r'[^a-z]', '', regex=True)

    def is_ghost(email):
        return '@evenhouse.club' in email or 'anonymous' in email
    df_tm['is_ghost'] = df_tm['email'].apply(is_ghost)

    # --- 3. Booking Stats ---
    print("Aggregating booking history...")
    df_bookings['user email'] = df_bookings['user email'].astype(str).str.lower().str.strip()
    valid_bookings = df_bookings[df_bookings['status'].isin(['confirmed', 'attended'])]

    email_stats = valid_bookings.groupby('user email').agg(
        count=('booking id', 'count'),
        last_date=('start date', 'max')
    ).to_dict('index')

    # --- 4. Cross-Referencing ---
    print("Linking profiles...")
    final_rows = []

    for idx, mb_row in df_mb.iterrows():
        linked_emails = []
        match_types = []

        # Strategy A: Find Trackman accounts by Name Key (since emails are often fake)
        if mb_row['normalized_key']:
            name_matches = df_tm[df_tm['normalized_key'] == mb_row['normalized_key']]
            for _, tm_match in name_matches.iterrows():
                linked_emails.append(tm_match['email'])
                match_types.append('name_match')

        # Strategy B: Find Trackman accounts by Real Email (if they used it once)
        email_matches = df_tm[df_tm['email'] == mb_row['Email Address']]
        for _, tm_match in email_matches.iterrows():
            if tm_match['email'] not in linked_emails:
                linked_emails.append(tm_match['email'])
                match_types.append('email_match')

        # Calculate Totals
        total_visits = 0
        last_visit = None
        unique_linked = list(set(linked_emails))

        for email in unique_linked:
            if email in email_stats:
                stat = email_stats[email]
                total_visits += stat['count']
                if stat['last_date']:
                    if last_visit is None or stat['last_date'] > last_visit:
                        last_visit = stat['last_date']

        final_rows.append({
            'mindbody_id': mb_row['BarcodeID'],
            'first_name': mb_row['first_name'],
            'last_name': mb_row['last_name'],
            'real_email': mb_row['Email Address'],
            'phone': mb_row['Phone'],
            'membership_tier': mb_row['Membership Tier'],
            'joined_on': mb_row['Joined On'],
            'total_bookings': total_visits,
            'last_booking_date': last_visit,
            'trackman_emails_linked': ', '.join(unique_linked)
        })

    # Export
    df_final = pd.DataFrame(final_rows)
    df_final = df_final.sort_values('total_bookings', ascending=False)
    df_final.to_csv(OUTPUT_FILE, index=False)
    print(f"Success! Cleaned data saved to: {OUTPUT_FILE}")
    print(f"Total Members Processed: {len(df_final)}")

if __name__ == "__main__":
    clean_data()