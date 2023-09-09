from flask import Flask, jsonify, request
import pandas as pd

app = Flask(__name__)

@app.route('/')
def home():
    return 'Flask server that serves MRT OD data.'

@app.route('/data', methods=['GET'])
def get_data():
    params = request.get_json()

    start_time = int(params['start_time'])
    end_time = int(params['end_time'])
    from_station = params['from_station']
    to_station = params['to_station']

    fil = (data["時段"] >= start_time) & (data["時段"] < end_time)

    group_by = ['出站', '進站']

    if to_station != 'all':
        fil = fil & (data["出站"] == to_station)
        group_by.remove('出站')
    if from_station != 'all':
        fil = fil & (data["進站"] == from_station)
        group_by.remove('進站')

    if group_by == []:
        count = data.loc[fil, :]['人次'].sum()
        output = {'出站': [to_station], '進站': [from_station], '人次': [str(count)]}
    else:
        output = data.loc[fil, :].groupby(group_by)['人次'].sum().reset_index().to_dict('list')

    return jsonify(output)


if __name__ == '__main__':
    data = pd.read_csv('/mnt/g/Taipei_Metro/OD/202307.csv')
    app.run(debug=True)

