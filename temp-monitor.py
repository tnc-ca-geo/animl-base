
import os
import csv
from gpiozero import CPUTemperature
from time import sleep, strftime, time

TEMP_LOG = os.path.abspath(
  os.path.join(os.path.dirname(__file__), "cpu_temp_log.csv"))
PAUSE_INTERVAL = 30 # wait 5 minutes
MAX_ROWS = 1000
cpu = CPUTemperature()

def write_temp(temp, log_file = TEMP_LOG):
    with open(log_file, 'a+', newline='') as log:
        rows = log.readlines()
        row_count = len(rows)
        print('row count: ', row_count)
        if row_count >= MAX_ROWS:
            print('removing first row')
            rows.pop(0)
        rows.append("{0},{1}\n".format(strftime("%Y-%m-%d %H:%M:%S"),str(temp)))
        log_writer = csv.writer(log, delimiter=',')
        for row in rows:
            log_writer.writerow(row)

while True:
    temp = cpu.temperature
    write_temp(temp)
    sleep(PAUSE_INTERVAL)