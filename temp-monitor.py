
import os
from gpiozero import CPUTemperature
from time import sleep, strftime, time

TEMP_LOG = os.path.abspath(
  os.path.join(os.path.dirname(__file__), "cpu_temp.csv"))
PAUSE_INTERVAL = 60
cpu = CPUTemperature()

def write_temp(temp, log_file = TEMP_LOG):
    with open(log_file, "a") as log:
        log.write("{0},{1}\n".format(strftime("%Y-%m-%d %H:%M:%S"),str(temp)))

while True:
    temp = cpu.temperature
    write_temp(temp)
    sleep(PAUSE_INTERVAL)