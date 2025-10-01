#!/bin/bash

if [ "$1" = "bash" ] || [ "$1" = "sh" ] || [ "$1" = "/bin/bash" ] || [ "$1" = "/bin/sh" ];
then
    exec "$@"
else
    yarn $@
fi

