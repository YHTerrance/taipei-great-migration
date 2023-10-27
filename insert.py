import glob
import os
import logging
import pickle
import pandas as pd
from sqlalchemy import text
from dotenv import load_dotenv
from logger import setup_logger
from db import create_engine


def read_data(path):

    if os.path.exists(path + '.pkl'):
        # Load data from pickle file
        with open(path + '.pkl', 'rb') as f:
            data_ = pickle.load(f)
    else:
        # Load data from CSV file
        data_ = pd.read_csv(path)

        # Preprocess the data
        data_ = data_.replace('O景安', '景安')
        data_ = data_.replace('BL板橋', '板橋')
        data_ = data_.replace('Y板橋', '板橋')
        data_ = data_.replace('G大坪林', '大坪林')
        data_ = data_.replace('O頭前庄', '頭前庄')

        # Save data to pickle file
        with open(path + '.pkl', 'wb') as f:
            pickle.dump(data_, f)

    return data_


def get_passengers_by_time_of_day(source):
    temp = source.groupby(['日期', '時段'])['人次'].sum().reset_index()

    passengers = \
        temp.groupby('時段')['人次'].mean().reset_index()
    passengers = \
        passengers.sort_values('時段', ascending=True)

    logging.info("Calculated the average number of passengers by time of day")
    logging.debug("%s", passengers)

    return passengers


def get_passengers_by_day_of_week(source):

    # Convert '日期' to datetime
    temp = source.groupby('日期')['人次'].sum().reset_index()

    temp['日期'] = pd.to_datetime(temp['日期'])

    # Extract day of the week and create a new column 'weekday'
    temp['weekday'] = temp['日期'].dt.day_name()

    # Define a custom list of weekday names in the desired order
    custom_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday',
                    'Friday', 'Saturday', 'Sunday']

    # Convert the 'weekday' column to a categorical data
    # type with the custom order
    temp['weekday'] = pd.Categorical(
        temp['weekday'], categories=custom_order, ordered=True
    )

    # Group by 'weekday' and calculate the mean number of passengers
    passengers = \
        temp.groupby('weekday')['人次'].mean().reset_index()

    logging.info("Calculated the average number of passengers by day of week")
    logging.debug("%s", passengers)

    return passengers


def get_routes_by_popularity(source):

    # Calculate the total number of people for each station pair
    station_pairs = source.groupby(['進站', '出站'])['人次'].sum().reset_index()

    # Remove duplicates by sorting the station names and
    # grouping by the sorted names
    station_pairs['站一'], station_pairs['站二'] = \
        zip(*station_pairs[['進站', '出站']].apply(sorted, axis=1))
    station_pairs = \
        station_pairs.groupby(['站一', '站二'])['人次'].sum().reset_index()

    # Remove same station reentries
    routes = station_pairs[station_pairs['站一'] != station_pairs['站二']]

    # Sort the routes in descending order of the number of people
    routes = routes.sort_values('人次', ascending=False)

    logging.info("Caculated routes by popularity")
    logging.debug("%s", routes)

    return routes


def get_stations_by_popularity(routes):

    temp_data_1 = routes.groupby(['站一'])['人次'].sum().reset_index() \
        .rename(columns={'站一': '站'})
    temp_data_2 = routes.groupby(['站二'])['人次'].sum().reset_index() \
        .rename(columns={'站二': '站'})

    popular_stations = pd.concat(
        [temp_data_1, temp_data_2], ignore_index=True
        ).groupby('站').sum().reset_index().sort_values('人次', ascending=False)

    logging.info("Calculated the most popular stations")
    logging.debug("%s", popular_stations)

    return popular_stations


def save_stations(eng, stations):
    # Insert station ids and names into the database
    with eng.connect() as connection:
        logging.info("Inserting %d stations", len(stations))
        for station in stations:
            logging.info("Inserting station %s", station)
            query = text("""
            INSERT IGNORE INTO Stations (station_name)
            VALUES (%s)
            """)
            result = connection.execute(query, station)
        connection.commit()
    return result


def get_station_id_mapping(eng):

    with eng.connect() as connection:
        query = text("""
        SELECT station_id, station_name
        FROM Stations
        """)
        result = connection.execute(query)
        mapping = {}
        for row in result:
            mapping[row[1]] = row[0]

        connection.commit()

    return mapping


def save_routes(eng, month, mapping, routes):

    logging.info("Inserting %d routes", len(routes))

    routes.rename(columns={'站一': 'station_one_id'}, inplace=True)
    routes.rename(columns={'站二': 'station_two_id'}, inplace=True)
    routes.rename(columns={'人次': 'passengers'}, inplace=True)

    routes['station_one_id'] = routes['station_one_id'].map(mapping)
    routes['station_two_id'] = routes['station_two_id'].map(mapping)

    routes = routes.assign(month=month)

    routes.to_sql(
        name='Routes',
        con=eng,
        if_exists='append',
        index=False
    )


def save_stations_info(eng, month, mapping, stations):

    logging.info("Inserting %d stations info", len(stations))

    stations = stations.assign(month=month)
    stations.rename(columns={'站': 'station_id'}, inplace=True)
    stations.rename(columns={'人次': 'passengers'}, inplace=True)
    stations['station_id'] = stations['station_id'].map(mapping)

    stations.to_sql(
        name='StationsInfo',
        con=eng,
        if_exists='append',
        index=False
    )


def save_passengers_by_time_of_day(eng, month, passengers):

    logging.info("Inserting %d passengers by time of day", len(passengers))

    passengers = passengers.assign(month=month)
    passengers.rename(columns={'時段': 'time_period'}, inplace=True)
    passengers.rename(columns={'人次': 'avg_passengers'}, inplace=True)

    passengers.to_sql(
        name='PassengersByTimePeriod',
        con=eng,
        if_exists='append',
        index=False
    )


def save_passengers_by_day_of_week(eng, month, passengers):

    logging.info("Inserting %d passengers by day of week", len(passengers))

    passengers = passengers.assign(month=month)
    passengers.rename(columns={'weekday': 'weekday'}, inplace=True)
    passengers.rename(columns={'人次': 'avg_passengers'}, inplace=True)

    passengers.to_sql(
        name='PassengersByWeekday',
        con=eng,
        if_exists='append',
        index=False
    )


def save_total_passengers(eng, month, passengers):

    logging.info("Inserting total passengers")

    query = text("""
        INSERT IGNORE INTO TotalPassengers (month, total_passengers)
        VALUES (:month, :total_passengers)
    """)

    params = {'month': month, 'total_passengers': passengers}

    with eng.connect() as connection:
        connection.execute(query,  params)
        connection.commit()


if __name__ == "__main__":

    setup_logger()

    load_dotenv()

    engine = create_engine()

    files = glob.glob(os.getenv("OD_FILE"))

    for file in files:

        logging.info("Processing file %s", file)

        data = read_data(file)

        data_month = pd.to_datetime(data['日期'].iloc[0])

        total_passengers = data['人次'].sum(axis=0)
        logging.info("Calculated total passengers")
        logging.debug("%s", total_passengers)

        routes_by_popularity = get_routes_by_popularity(data)

        stations_by_popularity = \
            get_stations_by_popularity(routes_by_popularity)

        passengers_by_time_of_day = get_passengers_by_time_of_day(data)

        passengers_by_day_of_week = get_passengers_by_day_of_week(data)

        # Save results to the database
        station_id_mapping = get_station_id_mapping(engine)
        stations_to_insert = \
            stations_by_popularity[~stations_by_popularity['站'].isin(
                station_id_mapping.keys()
            )]

        if len(stations_to_insert) > 0:
            save_stations(engine, stations_to_insert)
            station_id_mapping = get_station_id_mapping(engine)

        save_routes(
            engine,
            data_month,
            station_id_mapping,
            routes_by_popularity
        )

        save_stations_info(
            engine,
            data_month,
            station_id_mapping,
            stations_by_popularity
        )

        save_passengers_by_day_of_week(
            engine,
            data_month,
            passengers_by_day_of_week
        )

        save_passengers_by_time_of_day(
            engine,
            data_month,
            passengers_by_time_of_day
        )

        save_total_passengers(engine, data_month, total_passengers)
