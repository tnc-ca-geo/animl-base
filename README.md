# Animl Base
Node application deployed on Rasberry Pi wireless camera trap base station to 
push incoming images to s3. 

## Rasberry Pi setup
The current hardware includes: 
- Raspberry Pi 4b (4GB)
- SD card (64GB)
- SSD external drive (250GB)

1. To set up the Pi, load Rasbian to the SD card:

    1. Format the SD card using a desktop computer with the SD card 
[memory card formatter](https://www.sdcard.org/downloads/formatter/)
    2. Download the Rasberry Pi Imager for your OS 
[here](https://www.raspberrypi.org/downloads/) and step through wizard to burn 
the Rasbian image to the SD card
    3. Eject the SD card from your desktop computer, inster into Pi, and plug 
    in the Pi to turn it on
    4. Change the password of the default pi user by opening the terminal, 
    enter `passwd` on the command line and press Enter. You'll be prompted to 
    enter your current password to authenticate (if you haven't set it yet the 
    default pw is `raspberry`), and then asked for a new password.

2. Create new user called "animl", give it the same permissions as pi user, 
and switch user:
```
$ sudo adduser animl
$ usermod -a -G adm,dialout,cdrom,sudo,audio,video,plugdev,games,users,netdev,input animl
$ echo 'animl ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/010_animl-nopasswd
$ su - animl
```

3. TODO: format and mount hard drive

## Install Animl Base and dependencies
1. Once the Pi is up and running, enable SSH from the Raspberry Pi configuration 
menu, and download some additional global dependencies 
(node, vim, git, awscli, pm2):

```
$ sudo apt update
$ sudo apt full-upgrade -y
```
```
$ curl -sL https://deb.nodesource.com/setup_13.x | sudo -E bash
$ sudo apt-get install -y nodejs
```
```
$ sudo apt-get install vim -y
$ sudo apt-get install git
$ sudo apt-get install awscli
$ sudo npm install -g pm2
```

2. Create a directory to store the app, cd into it, clone the repo, and install
node dependencies:

```
$ mkdir /home/animl/animl-base
$ cd /home/animl/animl-base
$ git clone https://github.com/tnc-ca-geo/animl-base.git
$ cd animl-base
$ npm install
```

3. Add a .env file to the project's root directory with the following items: 

```
# AWS creds
AWS_ACCESS_KEY_ID = [REPLACE WITH KEY ID]
AWS_SECRET_ACCESS_KEY = [REPLACE WITH KEY]

# Directory to watch
IMG_DIR = '/path/to/images/'

# S3 
AWS_REGION = us-west-1
DEST_BUCKET = animl-images
```

## Set up Buckeye server software (Multibase Server Edition)
1. Download the Mbase [tarball](https://www.buckeyecam.com/getfile.php?file=mbse-latest-armv7hl.tbz)
and unzip using 
```
tar xcf /path/to/FILENAME.tbz
```

2. Move the `mbase` directory to `/usr/local`

3. Follow the installation instructions in `mbase/README.TXT' to complete the 
installation





## Usage
First, run any of the following to check if the app is already running in the 
background:
```
$ pm2 list
$ pm2 status
$ pm2 show app
```
If it's not listed, you can start the app temporarily:
```
$ npm start
```
Or start it up as a daemon (app will run indefinitely in the background):
```
$ npm run start-daemon
```
If you want to generate a script that will launch PM2 on boot together with the 
application, run: 
```
$ pm2 startup systemd
```
Then copy and run the generated command, and finally run:
```
$ pm2 save
```
This will save the current state of PM2 (with app.js running) in a dump file 
that will be used when they system starts or when resurrecting PM2.













