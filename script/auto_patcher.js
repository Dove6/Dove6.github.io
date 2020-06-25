(async function() {
    // debug
    let debug = true;

    /*
    * GLOBALS
    */
    let input_data = null;
    let detected_ids = {'game': null, 'library': null};
    let applicable_patches = null;
    let output_data = null;
    let database = null;
    let _ = null;  // for strings localization

    /*
    * FUNCTIONS
    */
    function processInputFile() {
        if (this.files.length == 0) {
            if (debug) {
                console.log('No input files selected!');
            }
            return;
        }
        document.getElementById('patch_choice').style.display = 'none';
        document.getElementById('unknown').style.display = 'none';
        document.getElementById('file_output').style.display = 'none';
        document.getElementById('file_output').setAttribute('download', this.files[0].name);
        input_data = null;
        output_data = null;
        detected_ids['game'] = null;
        detected_ids['library'] = null;
        this.files[0].arrayBuffer()
            .then(data => {
                input_data = data;
                if (debug) {
                    console.log('Loaded input data:\n', input_data);
                }
            })
            .then(calculateChecksum)
            .then(preparePatchChoice)
            .catch(error => {
                console.log('An error has occured:\n', error);
            });
    }

    function calculateChecksum() {
        if (input_data == null) {
            return Promise.reject(new Error('No input binary data present!'));
        }
        return new Promise((resolve, reject) => (crypto.subtle.digest('SHA-1', input_data)
            .then(result => {
                let checksum = (new Uint8Array(result))
                    .reduce((hex_string, byte) => (hex_string + ('0' + byte.toString(16)).slice(-2)), '')
                    .toLowerCase();
                if (debug) {
                    console.log('Calculated checksum:', checksum);
                }
                let recognized_library = database['libraries']
                    .filter(library => (library['checksum'].toLowerCase() == checksum));
                if (recognized_library.length > 0) {
                    detected_ids['library'] = recognized_library[0]['id'];
                    detected_ids['game'] = recognized_library[0]['game_id'];
                } else {
                    detected_ids['library'] = null;
                    detected_ids['game'] = null;
                    document.getElementById('unknown').style.display = 'block';
                }
                resolve();
            }, reject)
        ));
    }

    function preparePatchChoice() {
        document.getElementById('patch_checks').innerHTML = '';
        if (detected_ids['library'] == null) {
            applicable_patches = null;
            throw new Error('No library ID detected!');
        }
        document.getElementById('detected_game').innerHTML = database['games']
            .find(game => game['id'] == detected_ids['game'])['name'];
        document.getElementById('detected_library').innerHTML = database['libraries']
            .find(lib => lib['id'] == detected_ids['library'])['name'];
        document.getElementById('library_description').innerHTML = database['libraries']
            .find(lib => lib['id'] == detected_ids['library'])['comment'];
        applicable_patches = database['patches']
            .filter(patch => ((patch['library_id'] == detected_ids['library']) && (patch['is_valid'].toLowerCase() == 'true')));
        if (debug) {
            console.log('Available patches:\n', applicable_patches);
        }
        applicable_patches.forEach(patch => {
            let checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'patch' + patch['id'];
            checkbox.name = checkbox.id;
            checkbox.className = 'patch_check';
            let poisoned_ids = new Array();
            database['incompatibility']
                .filter(entry => (entry['patch_id1'] == patch['id'] || entry['patch_id2'] == patch['id']))
                .forEach(entry => {
                    if (entry['patch_id1'] == patch['id']) {
                        poisoned_ids.push(entry['patch_id2']);
                    } else {
                        poisoned_ids.push(entry['patch_id1']);
                    }
                });
            poisoned_ids = poisoned_ids.map(id => `patch${id}`);
            checkbox.addEventListener('change', event => {
                if (event.target.checked) {
                    poisoned_ids.forEach(poisoned_id => {
                        let poisoned_check = document.getElementById(poisoned_id);
                        if (poisoned_check) {
                            poisoned_check.checked = false;
                        }
                    });
                }
            });
            let label = document.createElement('label');
            label.setAttribute('for', checkbox.id);
            label.innerHTML = `${patch['name']}<br>${patch['description']}`;
            document.getElementById('patch_checks').appendChild(checkbox);
            document.getElementById('patch_checks').appendChild(label);
            document.getElementById('patch_checks').appendChild(document.createElement('br'));
        });
        document.getElementById('patch_choice').style.display = 'block';
    }

    function patchLibrary() {
        if (input_data == null) {
            if (debug) {
                console.log('No input binary data present!');
            }
            return;
        }
        output_data = input_data.slice();
        let output_editable = new Uint8Array(output_data);
        let patches_to_apply = new Array();
        let checked_boxes = Array.from(document.getElementsByClassName('patch_check')).filter(e => e.checked);
        checked_boxes.forEach(checkbox => {
            let id = checkbox.id.match(/patch(.+)$/)[1];
            patches_to_apply.push(database['patches'].find(patch => patch['id'] == id));
        });
        patches_to_apply.forEach(patch => {
            if (debug) {
                console.log(`Applying ${patch['name']} patch (id ${patch['id']})...`);
            }
            patch['data'].split('\n')
                .filter(e => e.length > 0)
                .map(e => e.match(/([0-9a-fA-F]{8}): ([0-9a-fA-F]{2})/))
                .map(e => ({'index': parseInt(e[1], 16), 'value': parseInt(e[2], 16)}))
                .forEach(e => {
                    output_editable[e['index']] = e['value'];
                });
        });
        document.getElementById('file_output').href = URL.createObjectURL(
            new Blob([output_data], {type: 'application/x-msdownload'})
        );
        document.getElementById('file_output').style.display = 'block';
        if (debug) {
            console.log('Patched!');
        }
    }


    /*
    * MAIN BODY
    */
    _ = await localizedStrings.generateLocalizationFunction(
        navigator.languages ? navigator.languages[0] : (navigator.language || navigator.userLanguage)
    );
    sheetParser.loadSheets()
        .then(loaded_db => {
            database = loaded_db;
            document.getElementById('file_input').addEventListener('change', processInputFile);
            document.getElementById('patch_button').addEventListener('click', patchLibrary);
            if (debug) {
                console.log({database});
                console.log('Sheet parsing promise status: resolved!');
            }
        }, error => {
            let main_article = document.getElementById('main_article');
            let error_article = document.getElementById('error_article');
            let db_error_section = document.getElementById('db_loading_error');
            let error_span = db_error_section.getElementsByClassName('error')[0];
            main_article.style.display = 'none';
            error_article.style.display = 'inline-block';
            db_error_section.style.display = 'block';
            error_span.innerHTML = String(error);
            if (debug) {
                console.log('Sheet parsing promise status: rejected!');
            }
        })
        .finally(() => {
            document.getElementById('loading').style.display = 'none';
            if (debug) {
                console.log('Sheet parsing promise settled!');
            }
        });
    Array.from(document.getElementsByClassName('localized')).forEach(element => {
        element.innerHTML = _(element.innerHTML);
    });
    document.getElementById('mail_notify').href = _(document.getElementById('mail_notify').href);
})();
