(function() {
    // debug
    let debug = true;


    /*
    * MAIN BODY
    */
    sheetParser.loadSheets()
        .then(database => {
            if (debug) {
                console.log(database['games']);
            }
            database['games'].forEach(game => {
                let game_node = document.createElement('div');
                game_node.innerHTML = '<p>' + game['name'] + '</p>';
                game_node.className = 'game';
                database['libraries'].filter(e => e['game_id'] == game['id']).forEach(library => {
                    let library_node = document.createElement('div');
                    library_node.innerHTML = '<p>' + library['name'] + '</p>';
                    library_node.className = 'library';
                    database['patches'].filter(e => e['library_id'] == library['id']).forEach(patch => {
                        let patch_node = document.createElement('p');
                        patch_node.className = 'patch';
                        let patch_link = document.createElement('a');
                        patch_link.innerHTML = patch['name'];
                        patch_link.href = URL.createObjectURL(new Blob([new Uint8Array(patch['data'].split('').map(c => c.charCodeAt(0)))], {type: 'text/plain'}));
                        patch_link.setAttribute('download', patch['name'] + '.patch');
                        patch_node.appendChild(patch_link);
                        let patch_description = document.createElement('span');
                        patch_description.innerHTML = ' - ' + patch['description'];
                        patch_node.appendChild(patch_description);
                        if (debug) {
                            console.log(patch_node);
                        }
                    });
                    game_node.appendChild(library_node);
                    if (debug) {
                        console.log(library_node);
                    }
                });
                document.getElementById('content').appendChild(game_node);
                if (debug) {
                    console.log(game_node);
                }
            });
        }, error => {
            let main_article = document.getElementsByTagName('article')[0];
            main_article.innerHTML = `<p>Błąd ładowania bazy łatek: <span class="error">${error}</span></p>`
                + '<p>Sprawdź połączenie internetowe, a następnie spróbuj odświeżyć stronę!</p>';
            if (debug) {
                console.log('Sheet parsing promise status: rejected!');
            }
        })
        .finally(() => {
            document.getElementById('loading').style.display = 'none';
            if (debug) {
                console.log('Page loaded!');
            }
        });
})();
