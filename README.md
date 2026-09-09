# Kasatria Assignment Data Visualizer

This repository contains a learning project created for the Kasatria Software Developer internship assessment.

The project demonstrates:

- Google OAuth sign-in
- Read-only Google Sheets API integration
- Searchable people data
- Three.js CSS3D visualization
- Table, Sphere, Double Helix, and Grid layouts
- Net-worth-based tile colors

## Use the deployed site

Open:

<https://amdsyhm.github.io/kasatria-assignment/>

1. Select **Sign in with Google**.
2. Approve the requested Google Sheets read-only permission if prompted.
3. Review the searchable records table.
4. Use the visualization buttons to switch between Table, Sphere, Helix, and Grid layouts.
5. Drag the visualization to rotate it and scroll to zoom.

## Run locally

Serve the project through a local web server. Do not open `index.html` directly with a `file:///` URL because Google OAuth requires a web origin.

For Apache, place the project folder in the server document root and open:

```text
http://localhost/Kasatria%20Assesment/
```

The local origin must be registered in Google Cloud as an authorized JavaScript origin.

## Project files

- `index.html` contains the page structure and Google authorization entry point.
- `style.css` contains the interface and visualization styles.
- `app.js` handles Google authorization, Google Sheets loading, profile display, and search filtering.
- `visualizer.js` creates the Three.js CSS3D tiles and required layouts.

## Configuration notes

The frontend uses a Google OAuth Client ID and a Google Sheet ID. The OAuth Client ID is not a client secret and may be present in browser code. Never place a Google client secret, password, access token, or private key in this repository.

The Google Cloud OAuth configuration must authorize the relevant website origins, and the Google account must have permission to read the source Google Sheet.

This project is intended for learning and assessment purposes and is not presented as a production-ready application.
