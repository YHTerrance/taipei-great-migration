# Fetch the results
import sqlite3

# Connect to the SQLite database
conn = sqlite3.connect('./202307.sqlite')

# Create a cursor object
cur = conn.cursor()

# SQL query to get the number of people traveling from '石牌' to other stations

'''
query = """SELECT [出站], SUM([人次]) as Total_Passengers
FROM [202307]
WHERE [進站] = '石牌'
GROUP BY [出站]
ORDER BY Total_Passengers DESC"""
'''

query = """SELECT SUM([人次]) as Total_Passengers
FROM [202307]
GROUP BY [出站], [進站]
ORDER BY Total_Passengers DESC
LIMIT 10"""

# Execute the query
cur.execute(query)

# Fetch the results
results = cur.fetchall()

print(results)

# Close the connection
conn.close()
