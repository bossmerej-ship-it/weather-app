# Landscape assets

These landscapes illustrate the atmosphere; they are not photographs of the selected city.

Locally hosted JPEGs from [Unsplash](https://unsplash.com/license):

- `alpine-lake.jpg`: https://images.unsplash.com/photo-1470770841072-f978cf4d019e (2400px, quality 85).
- `snow.jpg`: https://images.unsplash.com/photo-1464822759023-fed622ff2c3b (2000px, quality 80).
- `night.jpg`: https://images.unsplash.com/photo-1475274047050-1d0c0975c63e (2000px, quality 80).

Downloaded 2026-11-03. The app loads the first landscape eagerly and the alternate scenes lazily. Weather values always come from WeatherAPI.

## Full-screen sky (2026-11-04)

The interactive sky uses two locally hosted photographs, blended and masked in CSS. The photographs illustrate weather, not the selected city. No external image request is made while using the site.

- `sky-wisps.jpg`: Bonnie Kitahata, [blue sky and white clouds](https://unsplash.com/photos/blue-sky-and-white-clouds-9aHj3ZAETNA), source `https://images.unsplash.com/photo-1592698117601-70c282996f9c` (2400px, quality 82).
- `sky-day.jpg`: Milad Fakurian, [white clouds on blue sky](https://unsplash.com/photos/white-clouds-on-blue-sky-UiiHVEyxtyA), source `https://images.unsplash.com/photo-1596367407372-96cb88503db6` (2400px, quality 82).

Both are free under the [Unsplash License](https://unsplash.com/license). Saturation, brightness and precipitation are adjusted to real weather and local day/night in automatic mode. The older landscape files are retained for source history but are not used by the new sky component.
