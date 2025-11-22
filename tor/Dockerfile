FROM alpine:3.21

# Install Tor and su-exec (for dropping privileges)
RUN apk add --no-cache tor su-exec

# Create directory structure
RUN mkdir -p /var/lib/tor/hidden_service

# Copy configuration and entrypoint
COPY torrc /etc/tor/torrc
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Switch to root initially so entrypoint can fix permissions
USER root

ENTRYPOINT ["/entrypoint.sh"]
CMD ["tor"]

