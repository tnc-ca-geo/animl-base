# Animl Base
Animl Base is a node application deployed on Rasberry Pi that ingests new images 
from a Buckeye wireless camera trap base station and uploads them to S3.

> NOTE: Login credentials for the Santa Cruz Island camera trap systems can be found [here](https://tnc.app.box.com/file/762650708780). To request access, please contact nathaniel.rindlaub@tnc.org

## Table of Contents
- [Related repos](#related-repos)
- [Raspberry Pi setup](#rasberry-pi-setup)
- [Managment](#Managment)

## Related repos
- Animl API               http://github.com/tnc-ca-geo/animl-api
- Animl frontend          http://github.com/tnc-ca-geo/animl-frontend
- Animl base program      http://github.com/tnc-ca-geo/animl-base
- Animl ingest function   http://github.com/tnc-ca-geo/animl-ingest
- Animl ML resources      http://github.com/tnc-ca-geo/animl-ml
- Animl desktop app       https://github.com/tnc-ca-geo/animl-desktop


## Rasberry Pi setup
The current hardware includes: 
- [Raspberry Pi 4B](https://www.raspberrypi.org/products/raspberry-pi-4-model-b/), though RPi 3B is reccomended if running off solar
- [Sixfab Power Managment and UPS HAT](https://sixfab.com/power/) and [battery](https://www.18650batterystore.com/products/panasonic-ncr18650b)
- [Buckeye X80 PC Base Receiver](https://store.buckeyecam.com/wireless-receivers/x80-pc-base-receiver.html)
- [PoE Injector](https://www.amazon.com/gp/product/B00BK4W8TQ/ref=ppx_yo_dt_b_asin_title_o06_s01?ie=UTF8&psc=1)
- [PoE Splitter](https://www.amazon.com/gp/product/B07CNKX14C/ref=ppx_yo_dt_b_asin_title_o00_s00?ie=UTF8&psc=1)
- [micro SD card](https://www.amazon.com/gp/product/9875981818/ref=ppx_yo_dt_b_asin_title_o05_s00?ie=UTF8&psc=1)
- [USB flash drive (250GB)](https://www.amazon.com/gp/product/B07857Y17V/ref=ppx_yo_dt_b_asin_title_o05_s00?ie=UTF8&psc=1)

### Set up Pi

#### Step 1 - Assemble Sixfab Power Managment and UPS HAT
The Power Managment and UPS HAT solves a bunch of problems we encountered in our initial test deployment on SCI at once:
- its battery serves as a UPS, which should guard against temporary power outages at Valley Peak and buffer any power lags we may be experiencing due to the long cat6 we're using to draw POE
- it provides safe-shutdown configurations, so that if the battery % falls below a certain threshhold it will shut down the Pi safely
- it has a built in fan, which should help mitigate overheating
- its watchdog functionality should restart the pi automatically in the even that it hangs for any reason
- it serves a web app through which we can monitor the battery health, power supply, temperature and fan speed of the Pi remotely

Refer to the Sixfab [documentation](https://docs.sixfab.com/docs/raspberry-pi-power-management-ups-hat-introduction) for assembly instructions. Note, if you haven't already configured the Pi (step 2 below), you will need to hold off on setting up the Sixfab power software until the Pi is up and running.

#### Step 2 - Set up Pi to boot from the USB flash drive:

1. Good instructions on how to burn the Raspberry Pi OS to a flash drive and 
configure the RPi to boot from it: 
[RPi 3 instructions](https://pimylifeup.com/raspberry-pi-boot-from-usb/), [RPi 4 instructions](https://www.tomshardware.com/how-to/boot-raspberry-pi-4-usb). You'll need an SD card temporarily but won't need it once the RPi has been configured.
2. Start up the Pi and step through the set up wizard.
3. If you weren't prompted to change the pi user password in the setup 
wizard, change the password by opening the terminal, enter `passwd` on the 
command line and press Enter. You'll be prompted to 
enter your current password to authenticate (if you haven't set it yet the 
default pw is `raspberry`), and then asked for a new password.
4. ***If using RPi 3B, Increase swap size*** - we found that the 100MB default swap size is 
insufficient, and recommend increasing it significantly. If the USB flash drive 
is formatted in ext4 (as it should be if you followed step 1), this is as 
simple as opening the /etc/dphys-swapfile config, commenting out the lines that 
restric swap size so that the system computes it automatically 
(it should result in 2x the RAM of the device, so 1.83 GB in the case of the 
RPi 3B). 
```
$ sudo nano /etc/dphys-swapfile
```

Make sure all `CONF_SWAPFILE` settings are commented out. In particular 
`#CONF_SWAPSIZE` and `#CONF_SWAPFACTOR`. See 
[this](https://www.raspberrypi.org/forums/viewtopic.php?t=221762#p1360310) 
forum discussion for reference. Changes will take hold after reboot:
```
$ sudo reboot
```

After rebooting, you can confirm that swap size was inceased with the command:
```
$ swapon
```

#### Step 3 - Create new user called "animl"
The "animl" user will be the primary owner/user of all application files, 
directories, and processes going forward. Create it, give it the same 
permissions as the pi user, and switch user:
```
$ sudo adduser animl
$ sudo usermod -a -G adm,dialout,cdrom,sudo,audio,video,plugdev,games,users,netdev,input animl
$ echo 'animl ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/010_animl-nopasswd
$ su - animl
```
Modify the lightdm.conf file to make 'animl' the user that gets logged in 
automatically upon booting up. 

```
$ sudo nano /etc/lightdm/lightdm.conf
```
and replace 'pi' in the following line with 'animl':
```
autologin-user=pi
```


### Update network settings
#### Change the pi's hostname
This step is not necessary but may be helpful to better distinguish the pi on 
the network. To change the Pi's default hostname from "raspberrypi" to 
"animl-base", first update the `/etc/hosts` file:
```
$ sudo nano /etc/hosts
```
replace "raspberrypi" with "animl-base" in the last line of the file and save. 
Then open `/etc/hostname`:
```
$ sudo nano /etc/hostname
```
And replace "raspberrypi" with "animl-base".

#### Double check that avahi-daemon is installed and running
One of the easiest ways to connect remotely to your Pi and identify it on a 
local network is with mDNS (good explainer on that 
[here](https://www.howtogeek.com/167190/how-and-why-to-assign-the-.local-domain-to-your-raspberry-pi/)).
If you have Avahi installed and running on the Pi as described in that article, 
all  you need to do to SSH into your pi from within your local network is run 
`ssh [USER]@[HOSTNAME].local`. So in our case the SSH command would look like:
```
$ ssh animl@animl-base.local
```
This saves you from having to search for or remember the IP address of the Pi. 
Avahi This may have already been installed with the OS. To check, run:
```
$ avahi-daemon -V
```
If it returns a version number, you're all set, there's nothing more to do. If 
not, all you have to do is install Avahi, and then your device will be 
discoverable via  `[USER]@[HOSTNAME].local`:
```
$ sudo apt-get install avahi-daemon
```

#### Set up static IP address
To make sure that the IP address doesn't change when it get's 
disconnected/connected to the network (as is the case with DHCP IP assignments), 
you can modify the Raspberry Pi’s DHCP client daemon 
(instructions [here](https://pimylifeup.com/raspberry-pi-static-ip-address/)).

It's also worth mapping the fixed IP address to the device's MAC address in 
your router configuration, so another devices can't take it when the Pi isn't 
connected.

#### Download AnyDesk
We use AnyDesk for remoting into the Pi when it's in the field. You can 
download it [here](https://anydesk.com/en/downloads/raspberry-pi). Once you 
have it downloaded and installed, make note of your AnyDesk Address, and be 
sure to set a password to allow for unattended access.

NOTE: If you're using an RPi 4b, you may need to trick the Pi into thinking there is a monitor attached in order for Anydesk to work. To do so, make sure the ```hdmi_force_hotplug=1``` setting in the ```/boot/config.txt``` file is ***uncommented***:
```shell
sudo nano /boot/config.txt
```

### Set up Sixfab Power software
Instructions can be found towards the bottom of the page [here](https://docs.sixfab.com/docs/sixfab-power-getting-started). A few configurations to set:
- A scheduled event to reboot the device (via Hardware) once a day
- Set battery design capacity to ```3400```
- Enable watchdog

### Set up Buckeye server software (Multibase Server Edition) and register new base
1. Create new directory for the camera trap data
```shell
$ mkdir /home/animl/data
```

2. Download the Mbase [tarball](https://www.buckeyecam.com/main/Files/mbse-armv7hl.tbz)
and unzip using 
```shell
$ sudo tar -xjf /path/to/FILENAME.tbz
```

3. Move the `mbse` directory to `/usr/local`

4. Follow the installation instructions in `mbse/README.TXT` to complete the 
installation. In step 3 of the instructions, when you are asked to edit and copy 
the contents of `mbse/becmbse-sample.conf` to `etc/becmbse.conf`. You 
may run into permissions issues. The following commands will copy the file to 
`/etc/`, rename it, and change the owner to "animl".
```shell
$ sudo cp /usr/local/mbse/becmbse-sample.conf /etc/
$ sudo mv /etc/becmbse-sample.conf /etc/becmbse.conf
$ sudo chown animl:animl /etc/becmbse.conf
```

At which point you can copy/paste the following settings into the config file 
and save it: 

```
#This is where the writeable items (config and pictures) are stored.
#It cannot be the same as the program installation directory.
#This directory must be writeable by the user that the daemon
#will run as.
DATADIR=/home/animl/data

#Use and group.  May be name or number. Should not be root (0).
#The user may also need permission to access USB devices.
USER=animl
GROUP=animl

#TCP port for base manager HTTP
PORT=8888

#Enable (y) or disable (n) usb server
USBSERV="y"

#Options for SSL configuration.  Set this to use HTTPS instead of
#unencrypted HTTP.  The CACERT line is usually optional.
#CACERT=/path/to/cacert.crt
#PEMFILE=/path/to/ssl.pem

#Default parameters (run as a daemon in the background).  Try "mbased -?"
#to see available options.
DEFAULTPARAMS=-B 
```

5. Add `usr/local/mbse` to the "animl" user's PATH via `~/.profile`:
```shell
$ vim ~/.profile
```
Copy the following line to the bottom of the file and save:
```
PATH="/usr/local/mbse:$PATH"
```
You may need to close out of that shell and start a new one, restart the Pi, or switch users to the ```pi``` user and back to ```animl``` before the PATH will be updated.

6. Add your new base. Plug in the base to the RPi, then start up the the Multibase SE app from the terminal with:
```shell
$ mbasectl -s
```
Next, open up a browser and go to ```localhost:8888``` to access the Buckeye web app and login with the default credentials (default UN is ```Animl```, PW is ```lmina```). Navigate to ```Tools > Add Base```, and complete base registration. Once the base is added, make note of the serial number (if you're unsure, a directory named with the serial number will have been automatically created under ```/home/animal/data/```. You'll need that for the .env file you create in the next step. You can close out the browser window and kill the Multibase SE app: 
```shell
$ mbasectl -k
```

### Install Animl Base and dependencies
1. Enable SSH and VNC from the Raspberry Pi configuration menu, and download 
some additional global dependencies (node, vim, git, awscli, pm2):

```shell
$ sudo apt update
$ sudo apt full-upgrade -y
```
```shell
$ curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash
$ sudo apt-get install -y nodejs
```
```shell
$ sudo apt-get install vim -y
$ sudo apt-get install git -y
$ sudo apt-get install awscli -y
$ sudo npm install -g pm2
```

2. Create a directory for the animl-base application code, cd into it, clone the repo, and install node dependencies:

```shell
$ mkdir /home/animl/animl-base
$ cd /home/animl/animl-base
$ git clone https://github.com/tnc-ca-geo/animl-base.git
$ cd animl-base
$ npm install
```

3. Add a .env file to the project's root directory with the following items. Note, AWS creds can be found in the [SCI Cameratrap network passwords document](https://tnc.app.box.com/file/762650708780). For access, contact nathaniel.rindlaub@tnc.org: 

```
# AWS
AWS_ACCESS_KEY_ID = [REPLACE WITH KEY ID]
AWS_SECRET_ACCESS_KEY = [REPLACE WITH KEY]
AWS_REGION = us-west-1

# Image directory to watch
IMG_DIR = '/home/animl/data/<base name>/cameras/'

# Log file to watch
LOG_FILE = '/home/animl/data/<base name>/log.txt'

# S3 
DEST_BUCKET = animl-data-staging
```

4. To configure logrotate to rotate all logs from animl-base and the temerature 
monitoring script, first create the logrotate config file:

```shell
$ sudo vim /etc/logrotate.d/animl
```

then copy/paste/save the following config:

```
/home/animl/.pm2/pm2.log /home/animl/.pm2/logs/*.log /home/animl/animl-base/animl-base/*.csv {
        rotate 24
        weekly
        missingok
        notifempty
        compress
        delaycompress
        copytruncate
}
```

You can then test the configuration with:

```shell
$ sudo logrotate /etc/logrotate.conf --debug
```

5. Lastly, increase the the maximum number of files the RPi can watch. This 
is a good idea because the Animl Base app watches for changes to the directories 
that Multibase SE adds image files to, so as the number of images stored on the RPi 
grows, you begin to exhaust the default number (8,192) of files the system can watch.

To increase it, perform the steps described [here](https://klequis.io/error-enospc-system-limit-for-number-of-file-watchers-reached/)


### Start Multibase Server and Animl Base and temp-monitor.py as daemons
If you haven't plugged the Buckeye X-series PC Base to the Pi, you 
can do that now. 

We use [PM2](https://pm2.keymetrics.io/docs) to manage the application 
processes. To start the Buckeye Multibase Server, Animl Base, and the 
temp-monitor.py script up as daemons that will run in the background and 
automatically launch on restart, navigate to `~/animl-base/animl-base` and run:

```shell
$ npm run start-daemon
```

Next, to generate a script that will launch PM2 on boot together with the 
application, run: 
```shell
$ pm2 startup systemd
```
Then copy and run the generated command, and finally run:
```shell
$ pm2 save
```
This will save the current state of PM2 (with Animl Base and Mulitbase 
running) in a dump file that will be used when they system starts or when 
resurrecting PM2.


## Managment

### Check the status of the apps
Run any of the following from the Pi's terminal to check if the apps are already running in the 
background via pm2 (see 
[PM2 Cheatsheet](https://pm2.keymetrics.io/docs/usage/quick-start/#cheatsheet)):
```shell
$ pm2 list all
$ pm2 status
```

Use the following to check the status of animl-base specifically:
```shell
$ pm2 show animl-base
```

or Multibase Server:
```shell
$ mbasectl -i
```

### Sixfab power managment web app
For remotely monitoring the RPi's status and configuring power, connectivity, and temperature alerts, you can access [https://power.sixfab.com](https://power.sixfab.com) from any computer. Credentials are in the Camera trap network [password document](https://tnc.app.box.com/file/762650708780).

### Use VNC as remote desktop
Good instructions for VNC set up and access 
[here](https://www.raspberrypi.org/documentation/remote-access/vnc/)

### Use AnyDesk as remote desktop
[Download](https://anydesk.com/en/downloads/raspberry-pi) any desk on the pi 
then run 

```shell
$ sudo apt install <path-to-anydesk.deb file>
```

### Local webapp for managing Buckeye cams
For adding new cameras, repeaters, and managing deployed devices, use the Multibase Server edition local web application for, which can be found at `localhost:8888` from within the Pi when Mulibase is running. You can also remote-desktop into the Pi via AnyDesk/VCN and launch the local web app in a browser window if you're trying to manage the devices remotely.

NOTE: If you are having trouble adding a camera to the Base, from the 
Base home user interface (the page you get to after loging in and 
clicking the "admin" button under the base entry), 
try "restoring the network" (hamburger menu -> Restore Network). 
This will search for and locate any devices that were have 
already been registered to the base.

### SSH into Pi
To remotely login to the Pi via SSH, the Pi's SSH needs to be enabled from 
the Raspberry Pi configuration menu (hopefully this was done at setup).

If avahi-daemon is running (as described 
[above](https://github.com/tnc-ca-geo/animl-base/blob/master/README.md#double-check-that-avahi-daemon-is-installed-and-running), 
SSHing into the pi is as simple as:

```shell
$ ssh animl@animl-base.local
```

If not, you need to find the Pi's IP address on the network, which I've found is 
simple if the Pi is connected to a screen and you can use the terminal. Just 
run either of the following commands:
```shell
$ hostname -I
```
```shell
$ ifconfig
```

However, if you don't have direct access to the Pi and are trying to scan a 
network for it, `arp -a` or 
[nmap](https://www.theurbanpenguin.com/find-my-raspberry-pi-using-nmap/) might 
be helpful. Other approaches to try can be found 
[here](https://www.raspberrypi.org/documentation/remote-access/ip-address.md).

Once you have the Pi's IP address, you can SSH into it with 
`ssh [USER]@[IP ADDRESS]`, e.g.:
```shell
$ ssh animl@192.168.0.227
```

### Pulling down Animl Base updates from github and restarting remotely
SSH into the PI
```shell
$ ssh animl@animl-base.local
```

navigate to `~/animl-base/animl-base`, stop PM2, pull down the changes, and restart PM2:
```shell
$ pm2 stop all
$ git pull
$ npm install # if dependencies changed
$ pm2 restart all
```

### Accessing logs
***PM2 logs*** can be viewed via the terminal with:
```shell
$ pm2 logs --lines 100
# or, if you just want to see the last 30 lines of a specific app, use:
$ pm2 logs animl-base --lines 30
```

The complete log files can be found in `/home/animl/.pm2/logs/`.

The ***temperature monitor*** logs can be found in the 
`/home/animl/animl-base/animl-base/` directory (they're CSV files).

The Multibase Server Edition logs can be found in `/home/animl/data/<base ID>/`.
