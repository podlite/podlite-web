  
#!/bin/bash

if [ $* = "bash" ]
then
    exec "/bin/bash"
else
    yarn $@
fi

