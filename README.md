# Animl Base

Animl Base is a node application deployed on linux-based field computers that ingests new images from a Buckeye wireless camera trap base station and uploads them to S3.

> NOTE: Login credentials for TNC camera trap systems can be found [here](https://tnc.app.box.com/file/762650708780). To request access, please contact nathaniel.rindlaub@tnc.org

## Table of Contents

- [Hardware](#hardware)
- [Setup](#setup)
- [Managment](#Managment)
- [Related repos](#related-repos)

## Hardware

### Buckeye X80 PC Base Reciever

The [Buckeye X80 PC Base Receiver](https://store.buckeyecam.com/wireless-receivers/x80-pc-base-receiver.html) demodulates analogue RF transmissions and converts them into digital images, which get ported over to a connected computer via USB and stored on the filesystem.

### Computer

We have tested and used a variety of headless field computers, and set up instructions vary slightly depending on which you're using. Thus far we've used:

- [Raspberry Pi 4B](https://www.raspberrypi.org/products/raspberry-pi-4-model-b/) (or 3B, if running off solar). Reccomended peripherals include:
  - [Sixfab Power Managment and UPS HAT](https://sixfab.com/power/)
  - [PoE Injector](https://www.amazon.com/gp/product/B00BK4W8TQ/ref=ppx_yo_dt_b_asin_title_o06_s01?ie=UTF8&psc=1)
  - [PoE Splitter](https://www.amazon.com/gp/product/B07CNKX14C/ref=ppx_yo_dt_b_asin_title_o00_s00?ie=UTF8&psc=1)
  - [micro SD card](https://www.amazon.com/gp/product/9875981818/ref=ppx_yo_dt_b_asin_title_o05_s00?ie=UTF8&psc=1)
  - [USB flash drive (250GB)](https://www.amazon.com/gp/product/B07857Y17V/ref=ppx_yo_dt_b_asin_title_o05_s00?ie=UTF8&psc=1)
- [OnLogic ML-100G-51](https://www.onlogic.com/ml100g-51/) w/ Ubuntu Desktop 20.04. Reccomended peripherals include:
  - [Dummy HDMI plug](https://www.amazon.com/dp/B06XT1Z9TF?psc=1&ref=ppx_yo2ov_dt_b_product_details) to fix [AnyDesk issue](<[url](https://support.anydesk.com/knowledge/i-only-see-a-black-screen-or-waiting-for-image)>) when accessing headless computers.
- [Cincoze DA-1000](https://www.onlogic.com/da-1000/#) w/ Ubuntu Desktop 20.04 Reccomended peripherals include:
  - [Dummy DVI plug](https://www.amazon.com/dp/B0746HRZ3J?psc=1&ref=ppx_yo2ov_dt_b_product_details) to fix [AnyDesk issue](<[url](https://support.anydesk.com/knowledge/i-only-see-a-black-screen-or-waiting-for-image)>) when accessing headless computers.

## Setup

### Prep for Raspberry Pi only (can skip if not using RPi):

#### Assemble Sixfab Power Managment and UPS HAT

The Power Managment and UPS HAT solves a bunch of problems we encountered in our initial test deployment on SCI at once:

- its battery serves as a UPS, which should guard against temporary power outages at Valley Peak and buffer any power lags we may be experiencing due to the long cat6 we're using to draw POE
- it provides safe-shutdown configurations, so that if the battery % falls below a certain threshhold it will shut down the Pi safely
- it has a built in fan, which should help mitigate overheating
- its watchdog functionality should restart the pi automatically in the even that it hangs for any reason
- it serves a web app through which we can monitor the battery health, power supply, temperature and fan speed of the Pi remotely

Refer to the Sixfab [documentation](https://docs.sixfab.com/docs/raspberry-pi-power-management-ups-hat-introduction) for assembly instructions. Note, if you haven't already configured the Pi (step 2 below), you will need to hold off on setting up the Sixfab power software until the Pi is up and running.

#### Set up Sixfab Power software

Instructions can be found towards the bottom of the page [here](https://docs.sixfab.com/docs/sixfab-power-getting-started). A few configurations to set:

- A scheduled event to reboot the device (via Hardware) once a day
- Set battery design capacity to `3400`
- Enable watchdog

#### Set up Pi to boot from the USB flash drive:

1. Good instructions on how to burn the Raspberry Pi OS to a flash drive and
   configure the RPi to boot from it:
   [RPi 3 instructions](https://pimylifeup.com/raspberry-pi-boot-from-usb/), [RPi 4 instructions](https://www.tomshardware.com/how-to/boot-raspberry-pi-4-usb). You'll need an SD card temporarily but won't need it once the RPi has been configured.
2. Start up the Pi and step through the set up wizard.
3. If you weren't prompted to change the pi user password in the setup
   wizard, change the password by opening the terminal, enter `passwd` on the
   command line and press Enter. You'll be prompted to
   enter your current password to authenticate (if you haven't set it yet the
   default pw is `raspberry`), and then asked for a new password.
4. **_If using RPi 3B, Increase swap size_** - we found that the 100MB default swap size is
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

### Create new Linux user called "animl"

The "animl" user will be the primary owner/user of all application files,
directories, and processes going forward. Create it, give it the same
permissions as the pi user, and switch user:

```
$ sudo adduser animl
$ sudo usermod -a -G adm,dialout,cdrom,sudo,audio,video,plugdev,games,users,netdev,input animl
$ echo 'animl ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/010_animl-nopasswd
$ su - animl
```

### Change the hostname

This step is not necessary but may be helpful to better distinguish the computer on
the network. To change the computer's default hostname, first update the `/etc/hosts` file:

```
$ sudo nano /etc/hosts
```

replace "raspberrypi" (or whatever the default is) with "animl-base-[network-name]" in the last line of the file and save.
Then open `/etc/hostname`:

```
$ sudo nano /etc/hostname
```

And replace the default hostname with the same hostname you added to `/etc/hosts`.

### Make sure computer is set to automatically power-on in BIOS settings

This process will differ depending on the computer.

### Double check that avahi-daemon is installed and running

One of the easiest ways to connect remotely to your field computers and identify it on a
local network is with mDNS (good explainer on that
[here](https://www.howtogeek.com/167190/how-and-why-to-assign-the-.local-domain-to-your-raspberry-pi/)).
If you have Avahi installed and running on the Pi as described in that article,
all you need to do to SSH into your pi from within your local network is run
`ssh [USER]@[HOSTNAME].local`. So in our case the SSH command would look something like:

```
$ ssh animl@animl-base.local
```

This saves you from having to search for or remember the IP address of the field computer.
Avahi This may have already been installed with the OS. To check, run:

```
$ avahi-daemon -V
```

If it returns a version number, you're all set, there's nothing more to do. If
not, all you have to do is install Avahi, and then your device will be
discoverable via `[USER]@[HOSTNAME].local`:

```
$ sudo apt-get install avahi-daemon
```

### Download AnyDesk

We use AnyDesk for remote-desktoping into the field computers. You can download it [here](https://anydesk.com/en/downloads). Once you have it downloaded and installed, make note of your AnyDesk Address/ID, and be sure to set a password to allow for unattended access.

> NOTE: Some Ubuntu computers don't ship with Ubuntu's Software Installer application, but you can install the .deb file by running `sudo dpkg -i <the_file.deb>`. If it responds by saying you are missing a dependency, try running `sudo apt update` then `sudo apt --fix-broken-install` then `sudo apt -y upgrade`

If using Ubuntu Desktop, following installation, be sure to disable Wayland: in `/etc/gdm3/custom.conf`, uncomment the `WaylandEnable=false` line. This is important so that you can log in/out of Ubuntu user accounts while maintaining an AnyDesk connection.

> NOTE: You may also need to trick the computer into thinking there is a monitor attached in order for Anydesk to work. If you're using an RPi, make sure the `hdmi_force_hotplug=1` setting in the `/boot/config.txt` file is **_uncommented_**. If you're using a computer using Ubuntu Desktop, you may need to purchase a dummy [DVI](https://www.amazon.com/dp/B0746HRZ3J?psc=1&ref=ppx_yo2ov_dt_b_product_details) or [HDMI](https://www.amazon.com/dp/B06XT1Z9TF?psc=1&ref=ppx_yo2ov_dt_b_product_details) plug to emulate a monitor and allow remote access via AnyDesk.

### Enable SSH

For Raspberry Pi's running Raspbian OS, this can be done from the configuration/preferences menu. For Ubuntu, you'll need to download and install [openssh-server](https://linuxize.com/post/how-to-enable-ssh-on-ubuntu-20-04/).

### Set up Buckeye server software (Multibase Server Edition) and register new base

1. Create new directory for the camera trap data

```shell
$ mkdir /home/animl/data
```

2. Download the appropriate MulitBase SE version for your computer [here](https://www.buckeyecam.com/pages/downloads)
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

You may need to close out of that shell and start a new one or restart the computer before the PATH will be updated.

6. Add your new base. Plug the X80 PC Base Reciever into the computer, then start up the the Multibase SE app from the terminal with:

```shell
$ mbasectl -s
```

Next, open up a browser and go to `localhost:8888` to access the Buckeye web app and login with the default credentials (default UN is `Animl`, PW is `lmina`). Navigate to `Tools > Add Base`, and complete base registration. Once the base is added, make note of the serial number (if you're unsure, a directory named with the serial number will have been automatically created under `/home/animal/data/`. You'll need that for the .env file you create in the next step. You can close out the browser window and kill the Multibase SE app:

```shell
$ mbasectl -k
```

### Install Animl Base and dependencies

1. Download some additional global dependencies (node, vim, git, awscli, exiftool, pm2):

```shell
$ sudo apt update
$ sudo apt full-upgrade -y
```

```shell
$ curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash
$ sudo apt-get install -y nodejs
```

```shell
$ sudo apt-get install vim -y
$ sudo apt-get install git -y
$ sudo apt-get install awscli -y
$ sudo apt-get install libimage-exiftool-perl
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

3. Create a directories for `~/images/queue/` and `~/images/archive/`

```shell
$ mkdir /home/animl/images
$ mkdir /home/animl/images/queue
$ mkdir /home/animl/images/archive
```

3. Add a .env file to the project's root directory with the following items. Note, AWS creds can be found in the [TNC Cameratrap network passwords document](https://tnc.app.box.com/file/762650708780). For access, contact nathaniel.rindlaub@tnc.org:

```
# Base name (no spaces)
BASE_NAME = [network name]

# AWS
AWS_ACCESS_KEY_ID = [access key ID]
AWS_SECRET_ACCESS_KEY = [secret access key]
AWS_REGION = us-west-2

# Image directory to watch
WATCH_DIR = '/home/animl/data/<base name>/cameras/'
# WATCH_DIR = "c:\BuckEyeCam\X7D Base\pictures\" # Windows

# Directories for queued and archived images
QUEUE_DIR = '/home/animl/images/queue'
ARCHIVE_DIR = '/home/animl/images/archive'

# Log file to watch
LOG_FILE = '/home/animl/data/<base name>/log.txt'
# LOG_FILE = "c:\BuckEyeCam\X7D Base\log.txt" # windows

# S3
DEST_BUCKET = animl-images-ingestion-prod
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

5. Lastly, increase the the maximum number of files the computer can watch. This is a good idea because the Animl Base app watches for changes to the directories that Multibase SE adds image files to, so as the number of images stored on the computer grows, you begin to exhaust the default number (8,192) of files the system can watch. To increase it, perform the steps described [here](https://klequis.io/error-enospc-system-limit-for-number-of-file-watchers-reached/)

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

If you need make updates to animl-base after it's already been
running/daemonized (especially updates that affect
the `ecosystem.config.js` file), you'll want to pull down those changes and
run the following to clear the cached processes:

```shell
$ pm2 unstartup systemd
$ pm2 delete all
```

Following that, startup and re-save the process as you did before by followin
the steps above starting with `npm run start-daemon`.

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

### Local webapp for managing Buckeye cams

For adding new cameras, repeaters, and managing deployed devices, use the Multibase Server edition local web application, which can be found at `localhost:8888` from within the computer when Mulibase is running. You can remotely access it by remote-desktoping into the computer via AnyDesk/VCN and launchubg the local web app in a browser window if you're trying to manage the devices remotely. More detailed documentation on using the Buckeye MultiBase SE application can be found [here](https://tnc.app.box.com/file/794348600237?s=3x3e0onul82mxawahpo3qeffmzomm4uq).

> [!IMPORTANT]  
> Because animl-base moves images out of the directory that Multibase SE expects them to be in (see [explaination below](https://github.com/tnc-ca-geo/animl-base?tab=local-image-file-storage-and-archive) for more detail), it will appear in the Multibase SE webapp as though there the network has never recieved any images. We reccommend using https://animl.camera for all image review, but if you need to access the image files locally, a backup of the most recent images can be found at `~/images/archive/`.

> [!TIP]
> If you are having trouble adding a camera to the Base, from the Base home user interface (the page you get to after loging in and
> clicking the "admin" button under the base entry), try "restoring the network" (hamburger menu -> Restore Network). This will search for and locate any devices that were have already been registered to the base.

### Local image file storage and archive

Typically, Buckeye's MultiBase SE program stores all image files in the `~/data/data/<base name>/cameras/` directory. However, largely due to [memory issues](https://github.com/tnc-ca-geo/animl-base/issues/20) with watching an ever-growing directory of images, once animl-base detects a new image file it moves it to a "queue" directory at `~/images/queue/`, and after it's been successfully updated it gets moved to `~/images/archive/` to serve as a local backup of the image files.

### Sixfab power managment web app (Raspberry Pi only)

For remotely monitoring the RPi's status and configuring power, connectivity, and temperature alerts, you can access [https://power.sixfab.com](https://power.sixfab.com) from any computer. Credentials are in the Camera trap network [password document](https://tnc.app.box.com/file/762650708780).

### SSH

To remotely login to the computers via SSH, the computers's SSH needs to be enabled (see setup step above).

If you're connected to the same local network as the computer and avahi-daemon is running (as described above), simpley run:

```
$ ssh animl@[hostname].local
```

If not, you'll need to find the computer's IP address on the network, which I've found is simple if the Pi is connected to a screen and you can use the terminal. Just run either of the following commands:

```shell
$ hostname -I
```

```shell
$ ifconfig
```

However, if you don't have direct access to the Pi and are trying to scan a network for it, `arp -a` or [nmap](https://www.theurbanpenguin.com/find-my-raspberry-pi-using-nmap/) might be helpful. Other approaches to try can be found [here](https://www.raspberrypi.org/documentation/remote-access/ip-address.md).

Once you have the Pi's IP address, you can SSH into it with
`ssh [USER]@[IP ADDRESS]`, e.g.:

```shell
$ ssh animl@192.168.0.227
```

### Pulling down Animl Base updates from github and restarting remotely

SSH or remote into the computer, navigate to `~/animl-base/animl-base`, stop PM2, pull down the changes, and restart PM2:

```shell
$ pm2 stop all
$ git pull
$ npm install # if dependencies changed
$ pm2 restart all
```

### Accessing logs

**_PM2 logs_** can be viewed via the terminal with:

```shell
$ pm2 logs --lines 100
# or, if you just want to see the last 30 lines of a specific app, use:
$ pm2 logs animl-base --lines 30
```

The complete log files can be found in `/home/animl/.pm2/logs/`.

The **_temperature monitor_** logs can be found in the
`/home/animl/animl-base/animl-base/` directory (they're CSV files).

The Multibase Server Edition logs can be found in `/home/animl/data/<base ID>/`.

## Related repos

Animl is comprised of a number of microservices, most of which are managed in their own repositories.

### Core services

Services necessary to run Animl:

- [Animl Ingest](http://github.com/tnc-ca-geo/animl-ingest)
- [Animl API](http://github.com/tnc-ca-geo/animl-api)
- [Animl Frontend](http://github.com/tnc-ca-geo/animl-frontend)
- [EXIF API](https://github.com/tnc-ca-geo/exif-api)

### Wireless camera services

Services related to ingesting and processing wireless camera trap data:

- [Animl Base](http://github.com/tnc-ca-geo/animl-base)
- [Animl Email Relay](https://github.com/tnc-ca-geo/animl-email-relay)
- [Animl Ingest API](https://github.com/tnc-ca-geo/animl-ingest-api)

### Misc. services

- [Animl ML](http://github.com/tnc-ca-geo/animl-ml)
- [Animl Analytics](http://github.com/tnc-ca-geo/animl-analytics)
