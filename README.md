# Animl Base
Animl Base is a node application deployed on Rasberry Pi that ingests new images 
from a Buckeye wireless camera trap base station and uploads them to S3.

## Table of Contents
- [Related repos](#related-repos)
- [Raspberry Pi setup](#rasberry-pi-setup)
- [Managment](#Managment)

## Related repos
- Animl lambda function   http://github.com/tnc-ca-geo/animl-lambda
- Animl ML resources      http://github.com/tnc-ca-geo/animl-ml
- Animl desktop app       https://github.com/tnc-ca-geo/animl-desktop
- Animl cloud platform    https://github.com/tnc-ca-geo/animl

## Rasberry Pi setup
The current hardware includes: 
- Raspberry Pi 3b
- USB flash drive (250GB)

### Set up Pi

#### Step 1 - Set up Pi to boot from the USB flash drive:

1. Good instructions on how to burn the Raspberry Pi OS to a flash drive and 
configure the RPi to boot from it 
[here](https://pimylifeup.com/raspberry-pi-boot-from-usb/). You'll need an SD 
card temporarily but won't need it once the RPi has been configured.
2. Start up the Pi and step through the set up wizard.
3. If you weren't prompted to change the pi user password in the setup 
wizard, change the password by opening the terminal, enter `passwd` on the 
command line and press Enter. You'll be prompted to 
enter your current password to authenticate (if you haven't set it yet the 
default pw is `raspberry`), and then asked for a new password.
4. ***Increase swap size*** - we found that the 100MB default swap size is 
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

#### Step 2 - Create new user called "animl"
The "animl" user will be the primary owner/user of all application files, 
directories, and processes going forward. Create it, give it the same 
permissions as the pi user, and switch user:
```
$ sudo adduser animl
$ sudo usermod -a -G adm,dialout,cdrom,sudo,audio,video,plugdev,games,users,netdev,input animl
$ echo 'animl ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/010_animl-nopasswd
$ su - animl
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
`ssh [USER]@[HOSTNAME].local. So in our case:
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


### Set up Buckeye server software (Multibase Server Edition)
1. Download the Mbase [tarball](https://www.buckeyecam.com/main/Files/mbse-armv7hl.tbz)
and unzip using 
```
$ sudo tar -xjf /path/to/FILENAME.tbz
```

2. Move the `mbse` directory to `/usr/local`

3. Follow the installation instructions in `mbse/README.TXT` to complete the 
installation. In step 3 of the instructions, when you are asked to edit and copy 
the contents of `mbse/becmbse-sample.conf` to `etc/becmbse.conf`. You 
may run into permissions issues. The following commands will copy the file to 
`/etc/`, rename it, and change the owner to "animl".
```
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

4. Add `usr/local/mbse` to the "animl" user's PATH via `~/.profile`:
```
$ vim ~/.profile
```
Copy the following line to the bottom of the file and save:
```
PATH="/usr/local/mbse:$PATH"
```

### Install Animl Base and dependencies
1. Once the Pi is up and running, enable SSH and VNC from the Raspberry Pi 
configuration menu, and download some additional global dependencies 
(node, vim, git, awscli, nginx, pm2):

```
$ sudo apt update
$ sudo apt full-upgrade -y
```
```
$ curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash
$ sudo apt-get install -y nodejs
```
```
$ sudo apt-get install vim -y
$ sudo apt-get install git -y
$ sudo apt-get install awscli -y
$ sudo apt-get install nginx -y
$ sudo npm install -g pm2
```

2. Create a directory to store the data and a directory for the app, 
cd into the latter, clone the repo, and install node dependencies:

```
$ mkdir /home/animl/data
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
IMG_DIR = '/home/animl/data/<base name>/cameras/'

# S3 
AWS_REGION = us-west-1
DEST_BUCKET = animl-data-staging
```

4. Lastly, now that we have Vim we can modify the lightdm.conf file to make 
'animl' the user that gets logged in automatically upon booting up. 

```
$ sudo vim /etc/lightdm/lightdm.conf
```
and replace 'pi' in the following line with 'animl':
```
autologin-user=pi
```


### Start Multibase Server and Animl Base as daemons
If you haven't plugged the Buckeye X-series PC Base to the Pi, you 
can do that now. 

We use [PM2](https://pm2.keymetrics.io/docs) to manage the application 
processes. To start both the Buckeye Multibase Server and Animl Base up as 
daemons that will run in the background and automatically launch on restart, 
navigate to `~/animl-base/animl-base` and run:

```
$ npm run start-daemon
```

Next, to generate a script that will launch PM2 on boot together with the 
application, run: 
```
$ pm2 startup systemd
```
Then copy and run the generated command, and finally run:
```
$ pm2 save
```
This will save the current state of PM2 (with Animl Base and Mulitbase 
running) in a dump file that will be used when they system starts or when 
resurrecting PM2.

_NOTE: PM2 can start the Multibase Server because we can set it to execute the 
`mbasectl -s` startup command via the PM2 ecosystem config file, but it can not 
stop or otherwise control it because it's not a node app. Instead, you can use 
the following commands to manage the Multibase Server:_
```
# Get status of multibase server:
$ mbasectl -i

# Stop the server:
$ mbasectl -k

# Start the server:
$ mbasectl -s
```

### Local webapp for managing Buckeye cams
Multibase Server edition serves a locally-accessible web application for 
managing the deployed devices, which can be found at `localhost:8888` from 
within the Pi when Mulibase is running.

To access the webapp remotely, we can 
[use Nginx as a reverse proxy server](https://dev.to/bogdaaamn/run-your-nodejs-application-on-a-headless-raspberry-pi-4jnn) 
to redirect all external traffic from the Pi's port 80 to the Mulitbase Server 
web app running on port 8888. To do so, install nginx if you haven't already:
```
$ sudo apt update
$ sudo apt install nginx
```
Next, configure the reverse proxy server:
```
$ sudo vim /etc/nginx/sites-available/default
```
Replace the `server` block of code with the following, and save:
```
server {
        listen 80 default_server;
        listen [::]:80 default_server;

        root /var/www/html;

        index index.html index.htm index.nginx-debian.html;

        server_name _;

        location / {
            proxy_pass http://localhost:8888;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
}
```
Check the config syntax, and if that checks out, restart Nginx:
```
$ sudo nginx -t
$ sudo systemctl restart nginx
```

Now if you go to the Pi's IP address in your browser you should be directed to 
the Mulitbase Sever webapp, from which you can manage the base and all of its 
cameras.

NOTE: If you are having trouble adding a camera to the Base, from the 
Base home user interface (the page you get to after loging in and 
clicking the "admin" button under the base entry), 
try "restoring the network" (hamburger menu -> Restore Network). 
This will search for and locate any devices that were have 
already been registered to the base.


## Managment

### SSH into Pi
To remotely login to the Pi via SSH, the Pi's SSH needs to be enabled from 
the Raspberry Pi configuration menu (hopefully this was done at setup).

If avahi-daemon is running (as described 
[above](https://github.com/tnc-ca-geo/animl-base/blob/master/README.md#double-check-that-avahi-daemon-is-installed-and-running), 
SSHing into the pi is as simple as:

```
$ ssh animl@animl-base.local
```

If not, you need to find the Pi's IP address on the network, which I've found is 
simple if the Pi is connected to a screen and you can use the terminal. Just 
run either of the following commands:
```
$ hostname -I
```
```
$ ifconfig
```

However, if you don't have direct access to the Pi and are trying to scan a 
network for it, `arp -a` or 
[nmap](https://www.theurbanpenguin.com/find-my-raspberry-pi-using-nmap/) might 
be helpful. Other approaches to try can be found 
[here](https://www.raspberrypi.org/documentation/remote-access/ip-address.md).

Once you have the Pi's IP address, you can SSH into it with 
`ssh [USER]@[IP ADDRESS]`, e.g.:
```
$ ssh animl@192.168.0.227
```

### Use VNC as remote desktop
Good instructions for VNC set up and access 
[here](https://www.raspberrypi.org/documentation/remote-access/vnc/)

### Use AnyDesk as remote desktop
[Download](https://anydesk.com/en/downloads/raspberry-pi) any desk on the pi 
then run 

```
$ sudo apt install <path-to-anydesk.deb file>
```

### Check the status of the apps
Run any of the following to check if the apps are already running in the 
background via pm2 (see 
[PM2 Cheatsheet](https://pm2.keymetrics.io/docs/usage/quick-start/#cheatsheet)):
```
$ pm2 list all
$ pm2 status
```

Use the following to check the status of animl-base specifically:
```
$ pm2 show animl-base
```

or Multibase Server:
```
$ mbasectl -i
```

### Pulling down Animl Base updates from github and restarting remotely
SSH into the PI
```
$ ssh animl@animl-base.local
```

navigate to `~/animl-base/animl-base`, pull down the changes, and restart PM2:
```
$ git pull
$ pm2 restart all
```

### Local webapp for managing Buckeye cams
Multibase Server edition serves a locally-accessible web application for 
managing the deployed devices, which can be found at `localhost:8888` when 
Mulibase is running. If you configured Nginx as a reverse proxy as described 
[above](https://github.com/tnc-ca-geo/animl-base#local-webapp-for-managing-buckeye-cams),
you can access the webapp remotely by navigating to the Pi's IP address in your 
browser.

TODO: figure out where to store shared creds for the webap and add instructions 
here

### TODO: Accessing logs
