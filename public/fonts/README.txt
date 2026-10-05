Fonts bundled with this app
===========================

serif.ttf         Liberation Serif Regular   (metric-compatible with Times New Roman)
sans.ttf          Liberation Sans Regular    (metric-compatible with Arial)
serif-italic.ttf  Liberation Serif Italic

Copyright (c) 2012 Red Hat, Inc. with Reserved Font Name Liberation.
Digitized data copyright (c) 2010 Google Corporation with Reserved Font Name
Arimo, Tinos and Cousine.

Licensed under the SIL Open Font License, Version 1.1 - see LICENSE.txt.
The OFL explicitly permits bundling, embedding and redistribution with
software, which is why these three files are safe to ship and to embed into
generated PDFs.

Adding a real script font
-------------------------

No cursive face is bundled, because none with a redistributable licence was
available when this was built. To add one:

  1. Download a script font licensed under the OFL (for example Great Vibes,
     Parisienne, Allura or Tangerine).
  2. Save the regular weight as  public/fonts/script.ttf
  3. Add its licence file next to it.

The app checks for that file at runtime. If it is there, the "Script" option
in the placement editor uses it. If it is not, the option falls back to
serif-italic.ttf and the editor says so rather than pretending.
