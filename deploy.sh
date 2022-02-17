#!/bin/sh

# This script is supposed to be used in an openSUSE Tumbleweed Live DVD.

sudo rpm --import https://build.opensuse.org/projects/YaST/public_key
sudo zypper ar -f https://download.opensuse.org/repositories/YaST:/Head/openSUSE_Tumbleweed/YaST:Head.repo
RUBY_VERSION=ruby:`rpm --eval '%{rb_ver}'`
sudo zypper --non-interactive in --no-recommends \
  "rubygem($RUBY_VERSION:d-installer)" \
  d-installer-web \
  cockpit

sudo systemctl start cockpit
sudo systemctl start d-installer

# set 'linux' as password
echo "linux:Nk1RhI1GqlxdA" | sudo chpasswd -e linux

xdg-open http://localhost:9090/cockpit/static/installer/index.html 
