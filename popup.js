import { getDate, getTime, getDictionaryURL } from "./utils.js";

let options = document.getElementById("options");
let wordsDiv = document.getElementById("wordsDiv");
let wordAdder = document.getElementById("wordAdder");
let search = document.getElementById("search");

let entryBoxes = [];

// hide hover images 'homeHover' and 'optionsHover'
let homeHover = document.getElementById("homeHover");
homeHover.style.visibility = "hidden";
let optionsHover = document.getElementById("optionsHover");
optionsHover.style.visibility = "hidden";

/* make hover image and grab cursor appear when cursor
hovers over home button, remove it when cursor leaves
 */
let homeDiv = document.getElementById("home");
homeDiv.addEventListener("mouseover", () => {
    homeHover.style.visibility = "visible";
    homeDiv.classList.add("footerButtonHover");
});
homeDiv.addEventListener("mouseout", () => {
    homeHover.style.visibility = "hidden";
    homeDiv.classList.remove("footerButtonHover");
});

/* make hover image and grab cursor appear when cursor
hovers over options button, remove it when cursor leaves
 */
let optionsDiv = document.getElementById("options")
optionsDiv.addEventListener("mouseover", () => {
    optionsHover.style.visibility = "visible";
    optionsDiv.classList.add("footerButtonHover");
});
optionsDiv.addEventListener("mouseout", () => {
    optionsHover.style.visibility = "hidden";
    optionsDiv.classList.remove("footerButtonHover");
});

// add word and/or URL to Wordrive (through manual word adder)
function addEntries(wordInput, urlInput, type, event) {
    let newWord = true;
    let newUrl = true;
    let duplicateIndex = null;

    // trim word and URL inputs
    wordInput = wordInput.trim();
    urlInput = urlInput.trim();

    // check for duplicate words/URLs
    chrome.storage.sync.get("wordBank", (data) => {
        for (let i = 0; i < data.wordBank.length; i++) {
            let entry = data.wordBank[i];
            if (wordInput === entry.text) {
                newWord = false;
                duplicateIndex = i;

                // if empty URL, don't add (set 'newUrl = false')
                if (urlInput !== "") {
                    for (let j = 0; j < entry[type].length; j++) {
                        if (urlInput === entry[type][j]) {
                            newUrl = false;
                        }
                    }
                } else {
                    newUrl = false;
                }
            }
        }

        // save word and/or URL, if not duplicate and not empty
        if (wordInput !== "") {
            if (newWord) {
                data.wordBank.push({
                    text: wordInput,
                    sourceUrls: (urlInput === "")
                        ? []
                        : [urlInput],
                    refUrls: [getDictionaryURL(wordInput)],
                    date: getDate(),
                    time: getTime(),
                    notes: ""
                });
            } else {
                if (newUrl) {
                    data.wordBank[duplicateIndex][type].push(urlInput);
                }
            }

            chrome.storage.sync.set({"wordBank": data.wordBank});
        }
                    
        // refresh popup
        document.location.reload();

        // prevent word adder from reloading ('wordAdder' parent click event), if applicable
        if (event !== null) {
            event.stopPropagation();
        }
    });
}

// toggle edit/save button and save edits to Wordrive
function toggleButton(box, container, button, data, wordIndex, urlIndex, type) {
    // trim container text
    container.innerText = container.innerText.trim();

    // if not in edit mode, enter it and generate 'Save' button
    if (container.isContentEditable === false) {
        box.classList.add("entryBoxEditMode");
        button.innerHTML = "Save";
    // if in edit mode, exit it and save changes
    } else {
        // if entry is an empty string, restore entry box to original word/URL
        if (container.innerText === "") {
            container.innerText = (type === "word")
                                ? data.wordBank[wordIndex].text
                                : data.wordBank[wordIndex].sourceUrls[urlIndex];
        // if entry is a non-empty string, set the entry to that string
        } else {
            // if edited entry is a word
            if (type === "word") {
                // update array to reflect entered word
                data.wordBank[wordIndex].text = container.innerText;

                // compute indices of words that match entered word
                let firstIndex = data.wordBank.findIndex((element) => {
                    return (element.text === container.innerText) ? true : false;
                });
                let lastIndex = data.wordBank.length - 1 - data.wordBank.slice().reverse().findIndex((element) => {
                    return (element.text === container.innerText) ? true : false;
                });

                // if entered word is duplicate
                if (firstIndex !== lastIndex) {
                    // merge URLs from duplicate entry to current entry, then remove duplicate entry
                    for (const url of data.wordBank[wordIndex].sourceUrls) {
                        if (firstIndex === wordIndex) {
                            if (!data.wordBank[lastIndex].sourceUrls.includes(url)) {
                                data.wordBank[lastIndex].sourceUrls.push(url);
                            }
                        } else {
                            if (!data.wordBank[firstIndex].sourceUrls.includes(url)) {
                                data.wordBank[firstIndex].sourceUrls.push(url);
                            }
                        }
                    }
                    data.wordBank.splice(wordIndex, 1);

                    // refresh popup
                    document.location.reload();
                }
            // if edited entry is a URL
            } else {
                // update array to reflect entered URL
                data.wordBank[wordIndex][type][urlIndex] = container.innerText;

                // compute indices of URLs that match entered URL
                let firstIndex = data.wordBank[wordIndex][type].findIndex((element) => {
                    return (element === container.innerText) ? true : false;
                });
                let lastIndex = data.wordBank[wordIndex][type].length - 1 - data.wordBank[wordIndex][type].slice().reverse().findIndex((element) => {
                    return (element === container.innerText) ? true : false;
                });

                // remove duplicate URL, if it exists, then reload popup
                if (firstIndex !== lastIndex) {
                    data.wordBank[wordIndex][type].splice(firstIndex, 1);
                    document.location.reload();
                }
            }

            chrome.storage.sync.set({"wordBank": data.wordBank});
        }

        button.innerHTML = "Edit";
        box.classList.remove("entryBoxEditMode");
    }

    // toggle 'contenteditable' permission
    container.setAttribute("contenteditable", !container.isContentEditable);

    // return the contents of input box
    return container.innerText;
}

// actively return matching Wordrive entries on user input
search.addEventListener("keyup", () => {
    let filter = search.value.toLowerCase().trim();

    chrome.storage.sync.get("wordBank", (data) => {
        for (let i = 0; i < data.wordBank.length; i++) {
            let entry = data.wordBank[i];
            if (entry.text.indexOf(filter) > -1) {
                entryBoxes[i].style.display = "";
            } else {
                entryBoxes[i].style.display = "none";
            }
        }
    });
});

chrome.storage.sync.get("wordBank", (data) => {
    let addMode = false;

    for (let i = 0; i < data.wordBank.length; i++) {
        let entry = data.wordBank[i];

        /* init a div-span-button set for given word
           Note: an 'entryBox' is the parent div for each entry;
           a 'wordContainer' is the span displaying the word */
        let entryBox = document.createElement("div");
        let wordContainer = document.createElement("span");
        let wordEditButton = document.createElement("button");
        entryBoxes.push(entryBox);

        // add classes to 'entryBox,' 'wordContainer,' and 'wordEditButton'
        entryBox.classList.add("entryBox");
        wordContainer.classList.add("container");
        wordEditButton.classList.add("editButton");

        // init attribute 'contenteditable' to span element
        wordContainer.setAttribute("contenteditable", false);
        wordContainer.innerText = entry.text;
        wordEditButton.innerHTML = "Edit";

        // make 'wordEditButton' and 'wordContainer' children of 'entryBox'
        entryBox.appendChild(wordEditButton);
        entryBox.appendChild(wordContainer);
        wordsDiv.appendChild(entryBox);

        // save changes and exit edit mode with 'Enter'
        wordContainer.addEventListener("keydown", (event) => {
            if (event.code === "Enter") {
                toggleButton(entryBox, wordContainer, wordEditButton, data, i, null, "word");
            }
        });

        // toggle edit/save button on click
        wordEditButton.addEventListener("click", (event) => {
            wordEditButton.classList.add("beingEdited");
            toggleButton(entryBox, wordContainer, wordEditButton, data, i, null, "word");

            // prevent URL drop-down menu from firing ('entryBox' parent click event)
            event.stopPropagation();
        });

        // toggle URL drop-down menu on click
        entryBox.addEventListener("click", () => {
            // only toggle dropdown if not in word edit mode 
            if (wordContainer.isContentEditable === false) {
                // if off, turn URL mode on and create dropdown
                if (!entryBox.classList.contains("url-mode-on")) {
                    // remove any existing dropdown
                    if (document.getElementsByClassName("dropdown").length !== 0) {
                        document.getElementsByClassName("url-mode-on")[0].classList.remove("url-mode-on");
                        document.getElementsByClassName("dropdown")[0].remove();
                    }

                    // init add mode booleans
                    let sourceUrlAddMode = false;
                    let refUrlAddMode = false;

                    // init dropdown
                    let dropdown = document.createElement("div");
                    dropdown.classList.add("dropdown");
                    entryBox.insertAdjacentElement("afterend", dropdown);
    
                    // insert timestamp
                    let timestamp = document.createElement("div");
                    timestamp.innerHTML = `Added at ${entry.time} on ${entry.date}`;
                    dropdown.appendChild(timestamp);

                    // insert source URLs
                    let sourceUrls = document.createElement("div");
                    sourceUrls.innerHTML = "Found at:";
                    dropdown.appendChild(sourceUrls);
                    for (let j = 0; j < entry.sourceUrls.length; j++) {
                        let wordUrl = entry.sourceUrls[j];
    
                        /* init a div-span-button set for given URL
                        Note: a urlBox is the parent div for each entry;
                        a urlContainer is the span displaying the URL */
                        let urlBox = document.createElement("div");
                        let urlContainer = document.createElement("span");
                        let urlEditButton = document.createElement("button");
    
                        // add classes to 'urlBox,' 'urlContainer,' and 'urlEditButton'
                        urlBox.classList.add("entryBox");
                        urlContainer.classList.add("container");
                        urlEditButton.classList.add("editButton");
    
                        // init attribute 'contenteditable' to span element
                        urlContainer.setAttribute("contenteditable", false);
                        urlContainer.innerText = wordUrl;
                        urlEditButton.innerHTML = "Edit";
    
                        /* make 'urlEditButton' and 'urlContainer' children of 'urlBox'
                        and append 'urlBox' to 'sourceUrls' */
                        urlBox.appendChild(urlEditButton);
                        urlBox.appendChild(urlContainer);
                        sourceUrls.appendChild(urlBox);
    
                        // click handler: tell background script to open hyperlink
                        urlBox.addEventListener("click", () => {
                            // only open URL if not in URL edit mode
                            if (urlContainer.isContentEditable === false) {
                                chrome.runtime.sendMessage({
                                    msg: "new tab",
                                    url: wordUrl
                                });
                            }
                        });

                        // save changes and exit edit mode with 'Enter'
                        urlContainer.addEventListener("keydown", (event) => {
                            if (event.code === "Enter") {
                                wordUrl = toggleButton(urlBox, urlContainer, urlEditButton, data, i, j, "sourceUrls");
                            }
                        });

                        // toggle edit/save button on click
                        urlEditButton.addEventListener("click", (event) => {
                            urlEditButton.classList.add("beingEdited");
                            wordUrl = toggleButton(urlBox, urlContainer, urlEditButton, data, i, j, "sourceUrls");
    
                            // prevent URL from opening ('urlBox' parent click event)
                            event.stopPropagation();
                        });
                    }

                    // insert source URL adder
                    let sourceUrlAdder = document.createElement("div");
                    let sourceUrlAdderLabel = document.createElement("span");

                    // add classes to 'sourceUrlAdder'
                    sourceUrlAdder.classList.add("container");
                    sourceUrlAdder.classList.add("adder");

                    // set source URL adder label
                    sourceUrlAdderLabel.innerHTML = "+ Add source URL...";

                    // make 'sourceUrlAdder' child of 'sourceUrls' and 'sourceUrlAdderLabel' child of 'sourceUrlAdder'
                    sourceUrls.appendChild(sourceUrlAdder);
                    sourceUrlAdder.appendChild(sourceUrlAdderLabel);

                    // create source URL adder elements
                    // create inputs, labels, and buttons
                    let sourceTitleInput = document.createElement("input");
                    let sourceUrlInput = document.createElement("input");
                    let sourceTitleLabel = document.createElement("label");
                    let sourceUrlLabel = document.createElement("label");
                    let sourceCancel = document.createElement("button");
                    let sourceSave = document.createElement("button");
                    let sourceIsValidURL = true;

                    // hide source URL adder elems--only display when source URL add mode is toggled on
                    sourceTitleInput.style.display = "none";
                    sourceUrlInput.style.display = "none";
                    sourceTitleLabel.style.display = "none";
                    sourceUrlLabel.style.display = "none";
                    sourceCancel.style.display = "none";
                    sourceSave.style.display = "none";
        
                    // edit innerHTML
                    sourceTitleLabel.innerHTML = "Title: ";
                    sourceUrlLabel.innerHTML = "URL: ";
                    sourceCancel.innerHTML = "Cancel";
                    sourceSave.innerHTML = "Save";
        
                    // update DOM tree
                    sourceUrlAdder.appendChild(sourceTitleLabel);
                    sourceUrlAdder.appendChild(sourceTitleInput);
                    sourceUrlAdder.appendChild(sourceUrlLabel);
                    sourceUrlAdder.appendChild(sourceUrlInput);
                    sourceUrlAdder.appendChild(sourceCancel);
                    sourceUrlAdder.appendChild(sourceSave);
        
                    // set attributes
                    sourceTitleInput.setAttribute("id", "sourceUrlAdder-title");
                    sourceTitleInput.setAttribute("type", "text");
                    sourceUrlInput.setAttribute("id", "sourceUrlAdder-url");
                    sourceUrlInput.setAttribute("type", "url");
                    sourceTitleLabel.setAttribute("for", "sourceUrlAdder-title");
                    sourceUrlLabel.setAttribute("for", "sourceUrlAdder-url");
        
                    // set classes
                    sourceTitleInput.classList.add("input");
                    sourceUrlInput.classList.add("input");
                    sourceUrlInput.classList.add("url-input");
        
                    // check for valid URL input--disable save button if invalid
                    sourceUrlInput.addEventListener("keyup", () => {
                        sourceUrlInput.value = sourceUrlInput.value.trim();
                        sourceIsValidURL = sourceUrlInput.checkValidity();
        
                        if (sourceIsValidURL) {
                            sourceSave.disabled = false;
                        } else {
                            sourceSave.disabled = true;
                        }
                    });                    
        
                    // cancel pending changes and exit URL add mode by clicking 'Cancel' button
                    sourceCancel.addEventListener("click", (event) => {
                        // hide source URL adder elems
                        sourceTitleInput.style.display = "none";
                        sourceUrlInput.style.display = "none";
                        sourceTitleLabel.style.display = "none";
                        sourceUrlLabel.style.display = "none";
                        sourceCancel.style.display = "none";
                        sourceSave.style.display = "none";
            
                        // reset source URL adder label
                        sourceUrlAdderLabel.style.display = "";

                        // turn off source URL add mode
                        sourceUrlAddMode = false;

                        // prevent click event from firing on parent div 'sourceUrlAdder'
                        event.stopPropagation();
                    });

                    // save changes and exit URL add mode by clicking 'Save' button
                    sourceSave.addEventListener("click", () => {
                        addEntries(entry.text, sourceUrlInput.value, "sourceUrls", null);
                    });
        
                    // save changes and exit URL add mode with 'Enter' if URL is valid
                    sourceTitleInput.addEventListener("keydown", (event) => {
                        if (event.code === "Enter") {
                            if (sourceIsValidURL) {
                                addEntries(entry.text, sourceUrlInput.value, "sourceUrls", null);
                            }
                        }
                    });
                    sourceUrlInput.addEventListener("keydown", (event) => {
                        if (event.code === "Enter") {
                            if (sourceIsValidURL) {
                                addEntries(entry.text, sourceUrlInput.value, "sourceUrls", null);
                            }
                        }
                    });

                    sourceUrlAdder.addEventListener("click", () => {
                        // if not in source URL add mode, enter it
                        if (!sourceUrlAddMode) {
                            // hide source URL adder label
                            sourceUrlAdderLabel.style.display = "none";

                            // reveal source URL adder elems
                            sourceTitleInput.style.display = "";
                            sourceUrlInput.style.display = "";
                            sourceTitleLabel.style.display = "";
                            sourceUrlLabel.style.display = "";
                            sourceCancel.style.display = "";
                            sourceSave.style.display = "";
                
                            // turn on source URL add mode
                            sourceUrlAddMode = true;
                        }
                    });

                    // insert reference URLs
                    let refUrls = document.createElement("div");
                    refUrls.innerHTML = "Reference:";
                    dropdown.appendChild(refUrls);
                    for (let j = 0; j < entry.refUrls.length; j++) {
                        let refUrl = entry.refUrls[j];
    
                        /* init a div-span-button set for given URL
                        Note: a refBox is the parent div for each entry;
                        a refContainer is the span displaying the URL */
                        let refBox = document.createElement("div");
                        let refContainer = document.createElement("span");
                        let refEditButton = document.createElement("button");
    
                        // add classes to 'refBox,' 'refContainer,' and 'refEditButton'
                        refBox.classList.add("entryBox");
                        refContainer.classList.add("container");
                        refEditButton.classList.add("editButton");
    
                        // init attribute 'contenteditable' to span element
                        refContainer.setAttribute("contenteditable", false);
                        refContainer.innerText = refUrl;
                        refEditButton.innerHTML = "Edit";
    
                        /* make 'refEditButton' and 'refContainer' children of 'refBox'
                        and append 'refBox' to 'refUrls' */
                        refBox.appendChild(refEditButton);
                        refBox.appendChild(refContainer);
                        refUrls.appendChild(refBox);
    
                        // click handler: tell background script to open hyperlink
                        refBox.addEventListener("click", () => {
                            // only open URL if not in URL edit mode
                            if (refContainer.isContentEditable === false) {
                                chrome.runtime.sendMessage({
                                    msg: "new tab",
                                    url: refUrl
                                });
                            }
                        });

                        // save changes and exit edit mode with 'Enter'
                        refContainer.addEventListener("keydown", (event) => {
                            if (event.code === "Enter") {
                                refUrl = toggleButton(refBox, refContainer, refEditButton, data, i, j, "refUrls");
                            }
                        });

                        // toggle edit/save button on click
                        refEditButton.addEventListener("click", (event) => {
                            refEditButton.classList.add("beingEdited");
                            refUrl = toggleButton(refBox, refContainer, refEditButton, data, i, j, "refUrls");
    
                            // prevent URL from opening ('urlBox' parent click event)
                            event.stopPropagation();
                        });
                    }

                    // insert reference URL adder
                    let refUrlAdder = document.createElement("div");
                    let refUrlAdderLabel = document.createElement("span");

                    // add classes to 'refUrlAdder'
                    refUrlAdder.classList.add("container");
                    refUrlAdder.classList.add("adder");

                    // set reference URL adder label
                    refUrlAdderLabel.innerHTML = "+ Add reference URL...";

                    // make 'refUrlAdder' child of 'refUrls' and 'refUrlAdderLabel' child of 'refUrlAdder'
                    refUrls.appendChild(refUrlAdder);
                    refUrlAdder.appendChild(refUrlAdderLabel);

                    // create reference URL adder elements
                    // create inputs, labels, and buttons
                    let refTitleInput = document.createElement("input");
                    let refUrlInput = document.createElement("input");
                    let refTitleLabel = document.createElement("label");
                    let refUrlLabel = document.createElement("label");
                    let refCancel = document.createElement("button");
                    let refSave = document.createElement("button");
                    let refIsValidURL = true;

                    // hide reference URL adder elems--only display when reference URL add mode is toggled on
                    refTitleInput.style.display = "none";
                    refUrlInput.style.display = "none";
                    refTitleLabel.style.display = "none";
                    refUrlLabel.style.display = "none";
                    refCancel.style.display = "none";
                    refSave.style.display = "none";
        
                    // edit innerHTML
                    refTitleLabel.innerHTML = "Title: ";
                    refUrlLabel.innerHTML = "URL: ";
                    refCancel.innerHTML = "Cancel";
                    refSave.innerHTML = "Save";
        
                    // update DOM tree
                    refUrlAdder.appendChild(refTitleLabel);
                    refUrlAdder.appendChild(refTitleInput);
                    refUrlAdder.appendChild(refUrlLabel);
                    refUrlAdder.appendChild(refUrlInput);
                    refUrlAdder.appendChild(refCancel);
                    refUrlAdder.appendChild(refSave);
        
                    // set attributes
                    refTitleInput.setAttribute("id", "refUrlAdder-title");
                    refTitleInput.setAttribute("type", "text");
                    refUrlInput.setAttribute("id", "refUrlAdder-url");
                    refUrlInput.setAttribute("type", "url");
                    refTitleLabel.setAttribute("for", "refUrlAdder-title");
                    refUrlLabel.setAttribute("for", "refUrlAdder-url");
        
                    // set classes
                    refTitleInput.classList.add("input");
                    refUrlInput.classList.add("input");
                    refUrlInput.classList.add("url-input");
        
                    // check for valid URL input--disable save button if invalid
                    refUrlInput.addEventListener("keyup", () => {
                        refUrlInput.value = refUrlInput.value.trim();
                        refIsValidURL = refUrlInput.checkValidity();
        
                        if (refIsValidURL) {
                            refSave.disabled = false;
                        } else {
                            refSave.disabled = true;
                        }
                    });                    
        
                    // cancel pending changes and exit URL add mode by clicking 'Cancel' button
                    refCancel.addEventListener("click", (event) => {
                        // hide reference URL adder elems
                        refTitleInput.style.display = "none";
                        refUrlInput.style.display = "none";
                        refTitleLabel.style.display = "none";
                        refUrlLabel.style.display = "none";
                        refCancel.style.display = "none";
                        refSave.style.display = "none";
            
                        // reset reference URL adder label
                        refUrlAdderLabel.style.display = "";

                        // turn off reference URL add mode
                        refUrlAddMode = false;

                        // prevent click event from firing on parent div 'refUrlAdder'
                        event.stopPropagation();
                    });

                    // save changes and exit URL add mode by clicking 'Save' button
                    refSave.addEventListener("click", () => {
                        addEntries(entry.text, refUrlInput.value, "refUrls", null);
                    });
        
                    // save changes and exit URL add mode with 'Enter' if URL is valid
                    refTitleInput.addEventListener("keydown", (event) => {
                        if (event.code === "Enter") {
                            if (refIsValidURL) {
                                addEntries(entry.text, refUrlInput.value, "refUrls", null);
                            }
                        }
                    });
                    refUrlInput.addEventListener("keydown", (event) => {
                        if (event.code === "Enter") {
                            if (refIsValidURL) {
                                addEntries(entry.text, refUrlInput.value, "refUrls", null);
                            }
                        }
                    });

                    refUrlAdder.addEventListener("click", () => {
                        // if not in reference URL add mode, enter it
                        if (!refUrlAddMode) {
                            // hide reference URL adder label
                            refUrlAdderLabel.style.display = "none";

                            // reveal reference URL adder elems
                            refTitleInput.style.display = "";
                            refUrlInput.style.display = "";
                            refTitleLabel.style.display = "";
                            refUrlLabel.style.display = "";
                            refCancel.style.display = "";
                            refSave.style.display = "";
                
                            // turn on reference URL add mode
                            refUrlAddMode = true;
                        }
                    });

                    // insert notes
                    let notes = document.createElement("div");
                    let notesBox = document.createElement("div");

                    notes.innerHTML = "Notes:";
                    entry.notes = entry.notes.trim();
                    if (entry.notes === "") {
                        notesBox.innerHTML = "Write notes...";
                    } else {
                        notesBox.innerHTML = entry.notes;
                    }
                    
                    notesBox.setAttribute("contenteditable", true);
                    notesBox.setAttribute("id", "notesBox");

                    dropdown.appendChild(notes);
                    notes.appendChild(notesBox);

                    notesBox.addEventListener("keyup", () => {
                        entry.notes = notesBox.innerText;
                        chrome.storage.sync.set({"wordBank": data.wordBank});
                    });

                    // toggle URL mode on
                    entryBox.classList.add("url-mode-on");
                // if on, turn URL mode off and remove dropdown
                } else {
                    document.getElementsByClassName("dropdown")[0].remove();
                    entryBox.classList.remove("url-mode-on");
                }
            }
        });
    }

    // create add mode elements
    // create inputs, labels, and button
    let wordInput = document.createElement("input");
    let urlInput = document.createElement("input");
    let wordLabel = document.createElement("label");
    let urlLabel = document.createElement("label");
    let cancel = document.createElement("button");
    let save = document.createElement("button");
    let isValidURL = true;

    // hide word adder elems--only display when word add mode is toggled on
    wordInput.style.display = "none";
    urlInput.style.display = "none";
    wordLabel.style.display = "none";
    urlLabel.style.display = "none";
    cancel.style.display = "none";
    save.style.display = "none";

    // edit innerHTML
    wordLabel.innerHTML = "Word: ";
    urlLabel.innerHTML = "URL: ";
    cancel.innerHTML = "Cancel";
    save.innerHTML = "Save";

    // update DOM tree
    wordAdder.appendChild(wordLabel);
    wordAdder.appendChild(wordInput);
    wordAdder.appendChild(urlLabel);
    wordAdder.appendChild(urlInput);
    wordAdder.appendChild(cancel);
    wordAdder.appendChild(save);

    // set attributes
    wordInput.setAttribute("id", "wordAdder-word");
    wordInput.setAttribute("type", "text");
    urlInput.setAttribute("id", "wordAdder-url");
    urlInput.setAttribute("type", "url");
    wordLabel.setAttribute("for", "wordAdder-word");
    urlLabel.setAttribute("for", "wordAdder-url");

    // set classes
    wordInput.classList.add("input");
    urlInput.classList.add("input");
    urlInput.classList.add("url-input");

    // check for valid URL input--disable save button if invalid
    urlInput.addEventListener("keyup", () => {
        urlInput.value = urlInput.value.trim();
        isValidURL = urlInput.checkValidity();

        if (isValidURL) {
            save.disabled = false;
        } else {
            save.disabled = true;
        }
    });

    cancel.addEventListener("click", (event) => {
        // hide word adder elems
        wordInput.style.display = "none";
        urlInput.style.display = "none";
        wordLabel.style.display = "none";
        urlLabel.style.display = "none";
        cancel.style.display = "none";
        save.style.display = "none";

        // reset word adder label
        wordAdderLabel.style.display = "";

        // turn off add mode
        addMode = false;

        // prevent click event from firing on parent div 'wordAdder'
        event.stopPropagation();
    });

    // save changes and exit add mode by clicking 'Save' button
    save.addEventListener("click", (event) => {
        addEntries(wordInput.value, urlInput.value, "sourceUrls", event);
    });

    // save changes and exit add mode with 'Enter' if URL is valid
    wordInput.addEventListener("keydown", (event) => {
        if (event.code === "Enter") {
            if (isValidURL) {
                addEntries(wordInput.value, urlInput.value, "sourceUrls", null);
            }
        }
    });
    urlInput.addEventListener("keydown", (event) => {
        if (event.code === "Enter") {
            if (isValidURL) {
                addEntries(wordInput.value, urlInput.value, "sourceUrls", null);
            }
        }
    });

    wordAdder.addEventListener("click", () => {
        // if not in add mode, enter it
        if (!addMode) {
            // hide word adder label
            wordAdderLabel.style.display = "none";

            // reveal word adder elems
            wordInput.style.display = "";
            urlInput.style.display = "";
            wordLabel.style.display = "";
            urlLabel.style.display = "";
            cancel.style.display = "";
            save.style.display = "";

            // turn on word add mode
            addMode = true;
        }
    });
});

options.addEventListener("click", () => {
    window.location.href = "options-popup.html";
});