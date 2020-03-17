# Animl Base
Node application deployed on Rasberry Pi wireless camera trap base station to 
push incoming images to s3. 

## Rasberry Pi setup
The current hardware includes: 
- Raspberry Pi 4b (4GB)
- SD card (64GB)
- SSD external drive (250GB)

1. To set up the Pi, load Rasbian to the SD card:

Format the SD card using a desktop computer with the SD card 
[memory card formatter](https://www.sdcard.org/downloads/formatter/)

Download the Rasberry Pi Imager for your OS 
[here](https://www.raspberrypi.org/downloads/) and step through wizard to burn 
the Rasbian image to the SD card

2. Create new user (TODO)

3. Once the Pi is up and running, enable SSH from the Raspberry Pi configuration 
menu, and download some additional dependencies (node, vim, git, awscli, pm2):

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

3. Create a directory to store the app, cd into it, clone the repo, and install
node dependencies:

```
$ mkdir /home/pi/Documents/animl-base
$ cd /home/pi/Documents/animl-base
$ git clone https://github.com/tnc-ca-geo/animl-base.git
$ cd animl-base
$ npm install
```

4. Add a .env file to the project's root directory with the following items: 

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

## Usage
First, run any of the following to check if the app is already running in the 
background:
```
$ pm2 list
$ pm2 status
$ pm2 show
```
If it's not listed, you can start the app temporarily:
```
$ npm start
```
Or start it up as a daemon (in the background):
```
$ npm run start-daemon
```
If you want to generate a script that will lunch PM2 on boot together with the 
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













