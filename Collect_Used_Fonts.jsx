/*
    After Effects — Collect Used Fonts
    ----------------------------------
    After Effects 24.3+ recommended.

    Collects font files used by text layers into:
        <chosen folder>/Fonts/

    Handles:
    - Multiple fonts inside one text layer
    - Text layers with animated Source Text
    - Fonts exposed by After Effects via fontLocation
    - Duplicate font files
    - Adobe Fonts when AE exposes their local file path

    A report is also created for fonts AE could not resolve to a local file.
*/

(function () {
    function alertAndReturn(message) {
        alert(message);
        return;
    }

    if (!app.project) {
        alertAndReturn("No After Effects project is open.");
        return;
    }

    // CharacterRange was introduced in AE 24.3.
    var aeVersion = parseFloat(app.version);
    if (isNaN(aeVersion) || aeVersion < 24.3) {
        alertAndReturn(
            "This script requires After Effects 24.3 or newer.\n\n" +
            "Your version: " + app.version
        );
        return;
    }

    function isTextLayer(layer) {
        return layer &&
               layer.property("ADBE Text Properties") !== null &&
               layer.property("ADBE Text Properties").property("ADBE Text Document") !== null;
    }

    function addFont(fonts, seen, fontName, fontLocation) {
        var name = fontName || "Unknown";
        var location = fontLocation || "";

        // Prefer location as the identity because different font files can
        // theoretically have similar display names.
        var key = location
            ? "FILE|" + location.toLowerCase()
            : "NAME|" + name.toLowerCase();

        if (!seen[key]) {
            seen[key] = true;
            fonts.push({
                name: name,
                location: location
            });
        }
    }

    function inspectTextDocument(textDoc, fonts, seen) {
        if (!textDoc) return;

        var textLength = 0;
        try {
            textLength = textDoc.text.length;
        } catch (e) {
            return;
        }

        if (textLength === 0) return;

        // Inspect each character so mixed-font text is detected.
        for (var i = 0; i < textLength; i++) {
            try {
                var range = textDoc.characterRange(i, i + 1);

                var fontName = "";
                var fontLocation = "";

                try {
                    fontName = range.font || "";
                } catch (e1) {}

                try {
                    fontLocation = range.fontLocation || "";
                } catch (e2) {}

                addFont(fonts, seen, fontName, fontLocation);
            } catch (e3) {
                // Fall back to the TextDocument's first-character font.
                if (i === 0) {
                    try {
                        addFont(
                            fonts,
                            seen,
                            textDoc.font || "",
                            textDoc.fontLocation || ""
                        );
                    } catch (e4) {}
                }
            }
        }
    }

    function inspectTextLayer(layer, fonts, seen) {
        var textProp = layer
            .property("ADBE Text Properties")
            .property("ADBE Text Document");

        if (!textProp) return;

        // Always inspect the current value.
        try {
            inspectTextDocument(textProp.value, fonts, seen);
        } catch (e1) {}

        // If Source Text is animated, inspect every keyframe.
        try {
            if (textProp.numKeys > 0) {
                for (var k = 1; k <= textProp.numKeys; k++) {
                    try {
                        inspectTextDocument(textProp.keyValue(k), fonts, seen);
                    } catch (e2) {}
                }
            }
        } catch (e3) {}
    }

    function inspectComp(comp, fonts, seen, visited) {
        if (!comp || visited[comp.id]) return;
        visited[comp.id] = true;

        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);

            if (isTextLayer(layer)) {
                inspectTextLayer(layer, fonts, seen);
            }

            // Also inspect nested compositions.
            try {
                if (layer.source && layer.source instanceof CompItem) {
                    inspectComp(layer.source, fonts, seen, visited);
                }
            } catch (e) {}
        }
    }

    function inspectProject(fonts, seen) {
        var visited = {};

        for (var i = 1; i <= app.project.numItems; i++) {
            var item = app.project.item(i);

            if (item instanceof CompItem) {
                inspectComp(item, fonts, seen, visited);
            }
        }
    }

    function safeFileName(name) {
        return name.replace(/[\\\/:*?"<>|]/g, "_");
    }

    function sameFile(a, b) {
        try {
            return a.fsName.toLowerCase() === b.fsName.toLowerCase();
        } catch (e) {
            return false;
        }
    }

    function findExistingDestination(folder, source) {
        var candidate = new File(folder.fsName + "/" + safeFileName(source.name));

        if (!candidate.exists) {
            return candidate;
        }

        // If the exact same file is already there, reuse it.
        if (sameFile(source, candidate)) {
            return candidate;
        }

        // Avoid overwriting another font with the same filename.
        var dot = source.name.lastIndexOf(".");
        var stem = dot > 0 ? source.name.substring(0, dot) : source.name;
        var ext = dot > 0 ? source.name.substring(dot) : "";

        var n = 2;

        while (true) {
            candidate = new File(
                folder.fsName + "/" +
                safeFileName(stem + "_" + n + ext)
            );

            if (!candidate.exists) {
                return candidate;
            }

            n++;
        }
    }

    function writeReport(folder, fonts, copied, unavailable) {
        var report = new File(
            folder.fsName + "/Font Collection Report.txt"
        );

        report.encoding = "UTF-8";

        if (!report.open("w")) {
            return;
        }

        report.write("After Effects Font Collection Report\r\n");
        report.write("==================================\r\n\r\n");

        report.write("After Effects version: " + app.version + "\r\n");
        report.write("Fonts detected: " + fonts.length + "\r\n");
        report.write("Fonts copied:   " + copied.length + "\r\n");
        report.write("Unavailable:    " + unavailable.length + "\r\n\r\n");

        report.write("COPIED FONTS\r\n");
        report.write("------------\r\n");

        for (var i = 0; i < copied.length; i++) {
            report.write(copied[i].name + "\r\n");
            report.write("Source: " + copied[i].source + "\r\n");
            report.write("Saved:  " + copied[i].saved + "\r\n\r\n");
        }

        report.write("\r\nUNAVAILABLE FONTS\r\n");
        report.write("-----------------\r\n");

        for (var j = 0; j < unavailable.length; j++) {
            report.write(unavailable[j].name + "\r\n");
            report.write(
                "AE fontLocation: " +
                (unavailable[j].location || "<empty>") +
                "\r\n\r\n"
            );
        }

        report.close();
    }

    // ------------------------------------------------------------
    // Scan project
    // ------------------------------------------------------------

    var fonts = [];
    var seen = {};

    inspectProject(fonts, seen);

    if (fonts.length === 0) {
        alertAndReturn("No text-layer fonts were found in this project.");
        return;
    }

    // ------------------------------------------------------------
    // Choose output
    // ------------------------------------------------------------

    var outputFolder = Folder.selectDialog(
        "Choose where to save the collected fonts"
    );

    if (!outputFolder) {
        return;
    }

    var fontsFolder = new Folder(
        outputFolder.fsName + "/Fonts"
    );

    if (!fontsFolder.exists && !fontsFolder.create()) {
        alertAndReturn(
            "Could not create the Fonts folder:\n" +
            fontsFolder.fsName
        );
        return;
    }

    // ------------------------------------------------------------
    // Copy
    // ------------------------------------------------------------

    var copied = [];
    var unavailable = [];
    var copiedSources = {};

    for (var i = 0; i < fonts.length; i++) {
        var font = fonts[i];

        if (!font.location) {
            unavailable.push(font);
            continue;
        }

        var source = new File(font.location);

        if (!source.exists) {
            unavailable.push(font);
            continue;
        }

        var sourceKey = source.fsName.toLowerCase();

        if (copiedSources[sourceKey]) {
            continue;
        }

        var destination = findExistingDestination(fontsFolder, source);

        try {
            if (destination.exists && sameFile(source, destination)) {
                copiedSources[sourceKey] = true;

                copied.push({
                    name: font.name,
                    source: source.fsName,
                    saved: destination.fsName
                });

                continue;
            }

            if (source.copy(destination.fsName)) {
                copiedSources[sourceKey] = true;

                copied.push({
                    name: font.name,
                    source: source.fsName,
                    saved: destination.fsName
                });
            } else {
                unavailable.push(font);
            }
        } catch (copyError) {
            unavailable.push(font);
        }
    }

    writeReport(
        outputFolder,
        fonts,
        copied,
        unavailable
    );

    // ------------------------------------------------------------
    // Done
    // ------------------------------------------------------------

    var message =
        "Font collection complete.\n\n" +
        "Fonts detected: " + fonts.length + "\n" +
        "Fonts copied:   " + copied.length + "\n" +
        "Unavailable:    " + unavailable.length + "\n\n" +
        "Saved to:\n" +
        fontsFolder.fsName;

    if (unavailable.length > 0) {
        message +=
            "\n\nSome fonts could not be copied. " +
            "Check 'Font Collection Report.txt'.";
    }

    alert(message);
})();
