//VARIABLES
const resultDiv = document.getElementById("result");
const credentialsDiv = document.getElementById("credentials");

const visibleState = {
  localStorageVisible: false,
  linksListVisible: false,
  credentialsVisible: false
}

const checkButton = document.getElementById("checkButton");
const credentialsButton = document.getElementById("credentialsButton");

const showLinksButton = document.getElementById("showLinksButton");
const addLinksDiv = document.getElementById("links");

const linkKeyInput = document.getElementById("linkKeyInput");
const linkValueInput = document.getElementById("linkValueInput");
const saveLinkButton = document.getElementById("saveLinkButton");
const usefulLinks = [
];

const credentialsWebsiteInput = document.getElementById("credentialsWebsiteInput");
const credentialsKeyInput = document.getElementById("credentialsKeyInput");
const credentialsValueInput = document.getElementById("credentialsValueInput");
const saveCredentialButton = document.getElementById("saveCredentialButton");
const credentialsList = document.getElementById("credentialsList");


//Toggle functions

const emptyResultDiv = (div) => {
  div.innerHTML = "";
  return div
}

const toggleDisplay = async (changeStateButton, visibleState) => {
  let { localStorageVisible, linksListVisible, credentialsVisible } = visibleState;
  
  emptyResultDiv(resultDiv);
  // emptyResultDiv(credentialsDiv);

  switch (changeStateButton) {
      case checkButton: {
          localStorageVisible = !localStorageVisible;

          visibleState.localStorageVisible = localStorageVisible;
          visibleState.linksListVisible = false;
          visibleState.credentialsVisible = false;
          break;
      }
      case showLinksButton: {
          linksListVisible = !linksListVisible;

          visibleState.linksListVisible = linksListVisible;
          visibleState.credentialsVisible = false;
          visibleState.localStorageVisible = false;
          break;
      }
      case credentialsButton: {
          credentialsVisible = !credentialsVisible;

          visibleState.credentialsVisible = credentialsVisible;
          visibleState.linksListVisible = false;
          visibleState.localStorageVisible = false;
          break;
      }
  }
  checkButton.textContent = visibleState.localStorageVisible == true ? "Hide Local Storage" : "Show Local Storage";
  showLinksButton.textContent = visibleState.linksListVisible == true ? "Hide Useful Links" : "Show Useful Links";
  addLinksDiv.hidden = visibleState.linksListVisible == false ? true : false;
  credentialsDiv.hidden = visibleState.credentialsVisible == false ? true : false;
  credentialsButton.textContent = visibleState.credentialsVisible == true ? "Hide Credentials" : "Show Credentials"


  return visibleState;
};

//

//DB functions
let db;

const request = window.indexedDB.open("DevToolsDB", 3);
request.onerror = (event) => {
  alert("Database open failed. Be aware most of the functions will not work.");
};
request.onsuccess = (event) => {
  db = event.target.result;
  console.log("Database opened successfully");

};

request.onupgradeneeded = (event) => {
  db = event.target.result;
  console.log("Object Store creation");
  // Create an objectStore for this database
  const usefulLinksObject = db.createObjectStore("usefulLinks", { keyPath: "key" });
  const credentialsObject = db.createObjectStore("credentials", { keyPath: "key" });

  // Create indexes
  usefulLinksObject.createIndex("value", "value", { unique: false });
  credentialsObject.createIndex("key", "key", { unique: false });



  usefulLinksObject.transaction.oncomplete = (event) => {
    const usefulLinksObjectStore = db
    .transaction("usefulLinks", "readwrite")
    .objectStore("usefulLinks");

    usefulLinks.forEach((usefulLink) => {
      console.log(usefulLink);
      usefulLinksObjectStore.add({ key: usefulLink.key, value: usefulLink.value});
    });
  };
};


saveCredentialButton.addEventListener("click", async function () {
  const website = credentialsWebsiteInput.value.trim();
  const key = credentialsKeyInput.value.trim();
  const value = credentialsValueInput.value;
  if(key.length > 2 && value.length > 2, website.length > 2){
    db.transaction("credentials", "readwrite")
      .objectStore("credentials")
      .add({ website, key, value } );

      credentialsWebsiteInput.value = "";
      credentialsKeyInput.value = "";
      credentialsValueInput.value = "";
  } else {
    alert("Please enter both a key and a value.");
  }

  const data = await getDataFromDB('credentials');
  updateTable('credentials',data);
});

saveLinkButton.addEventListener("click", async function () {
  const key = linkKeyInput.value.trim();
  const value = linkValueInput.value;
  if(key.length > 2 && value.length > 2){
    db.transaction("usefulLinks", "readwrite")
      .objectStore("usefulLinks")
      .add({ key, value } );

      linkKeyInput.value = "";
      linkValueInput.value = "";
  } else {
    alert("Please enter both a key and a value.");
  }

  const data = await getDataFromDB('usefulLinks');
  updateTable('usefulLinks',data);

});



function checkLocalStorage() {
  const isEmpty = Object.keys(localStorage).length === 0;
  const localStorageData = isEmpty ? null : localStorage;
  chrome.runtime.sendMessage({ isEmpty, localStorageData });
}

function copyValueToClipboard(value) {
  const tempInput = document.createElement("input");
  document.body.appendChild(tempInput);
  tempInput.value = value;
  tempInput.select();
  document.execCommand("copy");
  document.body.removeChild(tempInput);
}


function getDataFromDB(collection){
  return new Promise((resolve, reject) => {
    const request = db.transaction(collection)
                 .objectStore(collection)
                 .getAll();

    request.onsuccess = ()=> {
        const data = request.result;
        resolve(data);
    }

    request.onerror = (err)=> {
        console.error(`Error to get all data: ${err}`);
        resolve(null);
    }
  });
}

function updateTable(action, data) {
  emptyResultDiv(resultDiv);
  switch (action) {
    case 'usefulLinks':
      if (data) {
        const listItems = data.map(
          (link) => `<li><a href="${
            link.value.startsWith("http") ? link.value : `https://${link.value}`
          }" target="_blank">${link.key}</a></li>`
        );
        resultDiv.innerHTML = listItems.join("");
      } else {
        resultDiv.innerText = "No available data please try again later.";
      }
   

      return true;
    case 'credentials':
      if (data) {
        const listItems = data.map(
          (credential) => `<li><a href="${
            credential.website.startsWith("http") ? credential.website : `https://${credential.website}`
          }" target="_blank">${credential.key} - ${credential.value}</a></li>`
        );
        resultDiv.innerHTML = listItems.join("");
      } else {
        resultDiv.innerText = "No available data please try again later.";
      }
      
      return true;
    default:
      return false;
  }
}

function updateSavedLinksTable(linksInDB) {
  emptyResultDiv(resultDiv);
  const linksList = document.createElement("ul");
  if (linksInDB) {
    const listItems = linksInDB.map(
      (link) => `<li><a href="${
        link.value.startsWith("http") ? link.value : `https://${link.value}`
      }" target="_blank">${link.key}</a></li>`
    );
    linksList.innerHTML = listItems.join("");
  } else {
    linksList.innerText = "No available data please try again later.";
  }
  resultDiv.appendChild(linksList);
  return true;
}


//MAIN MENU
showLinksButton.addEventListener("click", async function (event) {
  await toggleDisplay(showLinksButton, visibleState);
  if (visibleState.linksListVisible) {
    const linksInDB = await getDataFromDB('usefulLinks');
    updateTable('usefulLinks',linksInDB)
    return true;
  }
});

checkButton.addEventListener("click", async function () {
  await toggleDisplay(checkButton, visibleState);
 
  if (visibleState.localStorageVisible == true) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        function: checkLocalStorage,
      });
    });
  }
});

credentialsButton.addEventListener("click",async function () {
  await toggleDisplay(credentialsButton, visibleState); 
  if (visibleState.credentialsVisible) {
    const credentialsData = await getDataFromDB('credentials');
    updateTable('credentials',credentialsData);
    return true;

  } 
});
//



//EXECUTION
chrome.runtime.onMessage.addListener(function (message) {
  if (message.isEmpty) {
    resultDiv.textContent = "Local Storage is empty.";
  } else {
    const localStorageData = message.localStorageData;
    if (localStorageData) {
      const keys = Object.keys(localStorageData);
      const keysList = document.createElement("ul");
      keys.forEach((key) => {
        const listItem = document.createElement("li");
        const keyLink = document.createElement("a");
        const displayedKey = key.length > 45 ? key.slice(0, 45) + "..." : key;
        keyLink.textContent = displayedKey;
        keyLink.href = "#";

        keyLink.addEventListener("click", function (event) {
          event.preventDefault();
          copyValueToClipboard(localStorageData[key]);
          keyLink.textContent = "Copied to Clipboard!";
          keyLink.style.color = "orange";
          setTimeout(() => {
            keyLink.textContent = displayedKey;
            keyLink.style.color = "";
          }, 1500);
        });

        listItem.appendChild(keyLink);
        keysList.appendChild(listItem);
      });
      resultDiv.innerHTML = "";
      resultDiv.appendChild(keysList);
    } else {
      resultDiv.textContent = "Local Storage data is unavailable.";
    }
  }
});
