
import os
from gpiozero import CPUTemperature
from time import sleep, strftime, time
import matplotlib.pyplot as plt

TEMP_LOG = os.path.abspath(
  os.path.join(os.path.dirname(__file__), "cpu_temp.csv"))
PAUSE_INTERVAL = 60
cpu = CPUTemperature()

plt.ion()
x = []
y = []

def write_temp(temp, log_file = TEMP_LOG):
    with open(log_file, "a") as log:
        log.write("{0},{1}\n".format(strftime("%Y-%m-%d %H:%M:%S"),str(temp)))

def graph(temp):
    y.append(temp)
    x.append(time())
    plt.clf()
    plt.scatter(x,y)
    plt.plot(x,y)
    plt.draw()

while True:
    temp = cpu.temperature
    write_temp(temp)
#    graph(temp)
    sleep(PAUSE_INTERVAL)