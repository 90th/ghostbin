#!/bin/sh
set -e

# Fix permissions for the hidden service directory
# This is necessary because the volume mount might have different permissions
if [ -d "/var/lib/tor/hidden_service" ]; then
    chown -R tor:root /var/lib/tor
    chmod 700 /var/lib/tor
    chmod 700 /var/lib/tor/hidden_service
fi

# Execute the command as the tor user
exec su-exec tor "$@"
