//debug
let checksum = null;
let game_id = null;

let input_data = null;
let detected_ids = {'game': null, 'library': null};
let applicable_patches = null;
let output_data = null;
let db = new Array();

let tables = {
    'games': '1',
    'libraries': '2',
    'patches': '3',
    'incompatibility': '4'
};

for (let table in tables) {
    db[table] = new Array();
}

function createRow(grid_name) {
    switch (grid_name) {
        case 'games':
            return {
                'id': '1',
                'name': '2',
                'acronym': '3',
                'comment': '4'
            };
        case 'libraries':
            return {
                'id': '1',
                'name': '2',
                'checksum': '3',
                'comment': '4',
                'game_id': '5'
            };
        case 'patches':
            return {
                'id': '1',
                'name': '2',
                'description': '3',
                'modified_checksum': '4',
                'is_valid': '5',
                'data': '6',
                'comment': '7',
                'library_id': '8'
            };
        case 'incompatibility':
            return {
                'id': '1',
                'patch_id1': '2',
                'patch_id2': '3',
                'comment': '4'
            };
        default:
            console.log('Incorrect grid name: "' + String(grid_id) + '"');
    }
}

let columns = {
    'games': createRow('games'),
    'libraries': createRow('libraries'),
    'patches': createRow('patches'),
    'incompatibility': createRow('incompatibility')
};

function setLoaded(grid_name) {
    if (typeof(setLoaded.state) === 'undefined') {
        setLoaded.state = new Map();
        for (let table in tables) {
            setLoaded.state.set(table, false);
        }
    }
    setLoaded.state.set(grid_name, true);
    console.log(setLoaded.state);
    if (Array.from(setLoaded.state.values()).reduce((acc, val) => acc && val, true)) {
        document.getElementById('loading').style.display = 'none';
    }
}
let debug_map;
function loadGrid(grid_name) {
    fetch('https://spreadsheets.google.com/feeds/cells/1YYwB6YWPf3PysdrBDF2qNrdhiWlRKpBzvB7HyRAn048/' + tables[grid_name] + '/public/full?alt=json')
        .then(response => response.json())
        .then(data => {
            let rows = new Map();
            data['feed']['entry'].forEach(function (e) {
                if (e['gs$cell']['row'] != 1) {
                    //skipping column names
                    if (!rows.has(e['gs$cell']['row'])) {
                        rows.set(e['gs$cell']['row'], new Map());
                    }
                    rows.get(e['gs$cell']['row']).set(e['gs$cell']['col'], e['gs$cell']['$t']);
                }
            });
            console.log(rows);
            rows.forEach(function(e) {
                let row = createRow(grid_name);
                for (let column in row) {
                    debug_map = e;
                    row[column] = e.get(row[column]);
                }
                db[grid_name].push(row);
            });
            //database[tables[grid_name] - 1] = data;
            setLoaded(grid_name);
            console.log('Loaded! (grid ' + grid_name + ')');
        });
}

loadGrid('games');
loadGrid('libraries');
loadGrid('patches');
loadGrid('incompatibility');

document.getElementById('file_input').addEventListener('change', async function() {
    if (this.files.length > 0) {
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
                console.log('Got! (input_data)');
                console.log(input_data);
                calculateChecksum();
            });
    }
});

function calculateChecksum() {
    if (input_data != null) {
        crypto.subtle.digest('SHA-1', input_data)
            .then(result => {
                checksum = (new Uint8Array(result)).reduce((acc, val) => (acc + ('0' + val.toString(16)).slice(-2)), '').toLowerCase();
                console.log('Got! (checksum)');
                console.log(checksum);
                let recognized_library = db['libraries'].filter(e => e['checksum'].toLowerCase() == checksum);
                if (recognized_library.length > 0) {
                    detected_ids['library'] = recognized_library[0]['id'];
                    detected_ids['game'] = recognized_library[0]['game_id'];
                } else {
                    detected_ids['library'] = null;
                    detected_ids['game'] = null;
                    document.getElementById('unknown').style.display = 'block';
                }
                preparePatchChoice();
            });
    }
}

function preparePatchChoice() {
    document.getElementById('patch_checks').innerHTML = '';
    if (detected_ids['library'] != null) {
        document.getElementById('detected_game').innerHTML = db['games']
            .find(game => game['id'] == detected_ids['game'])['name'];
        document.getElementById('detected_library').innerHTML = db['libraries']
            .find(lib => lib['id'] == detected_ids['library'])['name'];
        document.getElementById('library_description').innerHTML = db['libraries']
            .find(lib => lib['id'] == detected_ids['library'])['comment'];
        applicable_patches = db['patches'].filter(e => e['library_id'] == detected_ids['library']);
        console.log('Available patches:', applicable_patches);
        applicable_patches.forEach(patch => {
            console.log(patch);
            let checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'patch' + patch['id'];
            checkbox.name = checkbox.id;
            checkbox.className = 'patch_check';
            let label = document.createElement('label');
            label.setAttribute('for', checkbox.id);
            label.innerHTML = patch['name'] + '<br>' + patch['description'];
            document.getElementById('patch_checks').appendChild(checkbox);
            document.getElementById('patch_checks').appendChild(label);
            document.getElementById('patch_checks').appendChild(document.createElement('br'));
        });
        document.getElementById('patch_choice').style.display = 'block';
    } else {
        applicable_patches = null;
    }
}

function patchLibrary() {
    if (input_data != null) {
        output_data = input_data.slice();
        let output_editable = new Uint8Array(output_data);
        let patches_to_apply = new Array();
        let checked_boxes = Array.from(document.getElementsByClassName('patch_check')).filter(e => e.checked);
        checked_boxes.forEach(checkbox => {
            let id = checkbox.id.match(/patch(.+)$/)[1];
            patches_to_apply.push(db['patches'].find(patch => patch['id'] == id));
        });
        patches_to_apply.forEach(patch => {
            console.log('Applying', patch['id']);
            patch['data'].split('\n')
                .filter(e => e.length > 0)
                .map(e => e.match(/([0-9a-fA-F]{8}): ([0-9a-fA-F]{2})/))
                .map(e => ({'index': parseInt(e[1], 16), 'value': parseInt(e[2], 16)}))
                .forEach(e => {
                    output_editable[e['index']] = e['value'];
                });
        });
        document.getElementById('file_output').href = URL.createObjectURL(new Blob([output_data], {type: 'application/x-msdownload'}));
        document.getElementById('file_output').style.display = 'block';
        console.log('Patched!');
    } else {
        console.log('No input binary data present!');
    }
}

document.getElementById('patch_button').addEventListener('click', patchLibrary);
