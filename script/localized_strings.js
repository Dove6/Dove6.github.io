let localizedStrings = (function() {
    return ({
        generateLocalizationFunction: function(lang_id) {
            return (new Promise((resolve, reject) => {
                lang_id = String(lang_id).slice(0, 2);
                let passthrough = (string => string);
                if (lang_id == 'en') {
                    resolve(passthrough);
                }
                fetch(`./locale/${lang_id}.json`)
                    .then(response => response.json())
                    .then(data => {
                        resolve(string => {
                            if (Object.keys(data).indexOf(string) > -1) {
                                return data[string];
                            } else {
                                return string;
                            }
                        });
                    })
                    .catch(() => resolve(passthrough));
            }));
        }
    });
})();
