# CAB432 Cloud Computing
### Local config
To re-establish dependencies, at root project directory do:
`npm install`  then `npm start`. Now open browser and go to `localhost:3000`.
If packages were removed from package.json, do `npm prune` and package uninstallation will be handled.

### Building docker file (locally)
`docker build -t weather-nav .` note the `.`, it's IMPORTANT.
Check if image has been built using `docker images`.

To test locally, do `docker run -p 80:80 weather-nav:latest`. 
The port number depends on what ENV PORT and EXPOSE were set to.

### Dealing with dockerhub
Make a repository on dockerhub. Here the repo is named `weather-nav`, same as the docker image file created.

Using `docker ps -a`, take note of the relative IMAGE_NAME from NAMES (last column) as we need it for our commit parameter. _NOTE: this is not the same as IMAGE name where it is `weather-nav:latest`._

Do a commit:
`docker commit -m "COMMIT_MESSAGE" -a "AUTHOR" IMAGE_NAME DOCKERHUB_REPO`
For example, in my case:
`docker commit -m "Initial commit" -a "Peter Chien" trange_mcnulty peter2380123/weather-nav:latest`

Now we can push with `docker push DOCKERHUB_REPO`. 
This might require login. If so, do `docker login` and enter your username and password, then redo the push.

### Install docker on EC2
To set up the EC2 instance, follow the AWS tutorial on BlackBoard.
*HOWEVER*, at the 'Configure Security Group' page, click 'Add Rule' and choose a HTTP type. The port should default to 80, which is what we want. 

After an EC2 instance has been setup, create new key pair and download it (`.pem`).
Locate the `.pem` file and do `chmod 400 KEY_PAIR_NAME.pem`.

Now we are ready to ssh into the AWS EC2 instance. For exmaple: 
`ssh -i "weather-nav.pem" ubuntu@ec2-34-230-72-79.compute-1.amazonaws.com`

Once we are in, do:
`sudo curl -fsSL https://get.docker.com/ | sh`
After this the docker package is then installed on this EC2 ubuntu instance. 
Here, we could do `sudo usermod` to avoid using `sudo` every time we call `docker`, but for some reason doesn't work on EC2. That's fine, we will just `sudo` whenever we call docker. 

Then do `sudo docker login` and enter username and password

Then, `sudo docker pull peter2380123/weather-nav` to pull from dockerhub.

Check `sudo docker images` which we will use the REPOSITORY to docker run.

For example:
`sudo docker run -p 80:80 peter2380123/weather-nav:latest`
Now it should be running. Use Public DNS (IPv4) as public link and voila!