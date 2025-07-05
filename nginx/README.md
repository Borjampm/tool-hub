# Nginx Test Page

This directory contains a simple test page for testing your nginx setup.

## Files

- `index.html` - A comprehensive test page that shows if nginx is working correctly
- `nginx.conf` - A basic nginx server configuration (optional)

## How to Use

The test web server is now included in your `npm.yml` compose file as the `test-web` service.

### Starting the Test Server

From your project root, run:

```bash
docker-compose -f npm.yml up -d
```

This will start both:
- Your nginx-proxy-manager (ports 80, 81, 443)
- The test web server (port 8080)

### Accessing the Test Page

Open your browser and go to `http://localhost:8080`

### What the Test Page Shows

The test page will display:
- ✅ Success message if nginx is serving correctly
- Server information (date, time, user agent)
- Test results for HTML, CSS, JavaScript, and HTTP response
- A clean, professional interface

## Troubleshooting

If you can't see the page:
- Check that the containers are running: `docker-compose -f npm.yml ps`
- Verify port 8080 is accessible
- Check container logs: `docker logs test-web`

## Managing the Service

```bash
# Stop all services
docker-compose -f npm.yml down

# Restart just the test-web service
docker-compose -f npm.yml restart test-web

# View logs
docker-compose -f npm.yml logs test-web
```

## Security Features

The nginx configuration includes:
- Basic security headers
- Gzip compression
- Static file caching
- Error page handling
- Protection against common attacks
