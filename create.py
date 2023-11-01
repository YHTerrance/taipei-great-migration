from db import connect

connection = connect()

try:
    with connection.cursor() as cursor:
        # Create stations table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS Stations (
            station_id INT AUTO_INCREMENT PRIMARY KEY,
            station_name VARCHAR(255),
            UNIQUE(station_name)
        )
        """)

        # Create routes table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS Routes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            month DATE,
            station_one_id INT,
            station_two_id INT,
            passengers BIGINT,
            INDEX(month),
            INDEX(station_one_id),
            INDEX(station_two_id),
            UNIQUE(month, station_one_id, station_two_id)
        )
        """)

        # Create stations info table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS StationsInfo (
            id INT AUTO_INCREMENT PRIMARY KEY,
            month DATE,
            station_id INT,
            passengers BIGINT,
            INDEX(month),
            INDEX(station_id),
            UNIQUE(month, station_id)
        )
        """)

        # Create passengers by time period table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS PassengersByTimePeriod (
            id INT AUTO_INCREMENT PRIMARY KEY,
            month DATE,
            time_period INT,
            avg_passengers FLOAT,
            INDEX(month),
            INDEX(time_period),
            UNIQUE(month, time_period)
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS StationPassengersByTimePeriod (
            id INT AUTO_INCREMENT PRIMARY KEY,
            station_id INT,
            month DATE,
            time_period INT,
            passengers_in FLOAT,
            passengers_out FLOAT,
            INDEX(station_id),
            INDEX(month),
            INDEX(time_period),
            UNIQUE(station_id, month, time_period)
        )
        """)

        # Create passengers by weekday table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS PassengersByWeekday (
            id INT AUTO_INCREMENT PRIMARY KEY,
            month DATE,
            weekday VARCHAR(255),
            avg_passengers FLOAT,
            INDEX(month),
            INDEX(weekday),
            UNIQUE(month, weekday)
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS StationPassengersByWeekday (
            id INT AUTO_INCREMENT PRIMARY KEY,
            station_id INT,
            month DATE,
            weekday VARCHAR(255),
            avg_passengers FLOAT,
            INDEX(station_id),
            INDEX(month),
            INDEX(weekday),
            UNIQUE(station_id, month, weekday)
        )
        """)

        # Create total passengers table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS TotalPassengers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            month DATE,
            total_passengers BIGINT,
            INDEX(month),
            UNIQUE(month)
        )
        """)

    connection.commit()

finally:
    connection.close()
