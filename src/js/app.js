App = {
    web3Provider: null,
    contracts: {},
    blockchainAddress: "http://localhost:7575",
    tokens: [],

    init: async function () {
        var tokens = [];

        //Retrieve Token
        const cookie = getCookie("tokens")
        if(cookie == ""){
            $.getJSON('../token.json', function(data) {   
                tokens = data;
                setCookie(data);
            });
        }
        else{
            tokens = JSON.parse(cookie);
        }

        var html = "";
        for(var i = 0 ; i < tokens.length; i++){
            html += "<option value='" + tokens[i].address + "'>"+tokens[i].symbol+"</option>";
        }
        $(".token").html(html);

        return await App.initWeb3();
    },
    initWeb3: async function () {
        if (window.ethereum) {
            App.web3Provider = window.ethereum;
            try {
                await window.ethereum.request({ method: "eth_requestAccounts" });;
            }
            catch (error) {
                console.error("User denied account access");
            }
        }
        else if (window.web3) {
            App.web3Provider = windows.web3.currentProvider;
        }
        else {
            App.web3Provider = new Web3.providers.HttpProvider(blockchainAddress);
        }
        return App.initContract();
    },
    initContract: function () {
        //Artifact (Depolyed .sol with API)
        $.getJSON('Dex.json', function (data) {
            var artifact = data;
            App.contracts.dex = TruffleContract(artifact);

            App.contracts.dex.setProvider(App.web3Provider);

            //return App.retrieveAddedToken();
        });

        $.getJSON('ERC20Interface.json', function (data) {
            var artifact = data;
            App.contracts.token = TruffleContract(artifact);                        
            App.contracts.token.setProvider(App.web3Provider);
            //return App.retrieveAddedToken();
        });
        
        //Only Show Pool after make connection to contract
        const cookie = getCookie("pools")
        if(cookie != ""){
            const pools = JSON.parse(cookie);                        
            for(var i = 0 ; i < pools.length;i++){
                $("#poolGroup").append(createPoolRecord(pools[i]))                
            }

            if(pools.length == 0){
                $("#poolGroup").html("<div class='list-group-item'><p class='text-center p-2'>No Pool Available</p></div>");
            }
        }
        else{
            $("#poolGroup").html("<div class='list-group-item'><p class='text-center p-2'>No Pool Available</p></div>");
        }
        return App.bindEvents();
    },
    bindEvents: function () {
        $("#checkPool").on('click', function () {
            App.checkPoolAvailability("0xf171469d7cCdda0b7641e230e6a4c2eF98779e0e", "0x55B2DFc524b402b0E74Dc05543012ABc464f8ed1");
        })
        $("#checkToken").on('click', function () {
            App.checkToken("0xf171469d7cCdda0b7641e230e6a4c2eF98779e0e");
        })

        $("#checkBalance").on('click', function () {
            App.checkBalances("0xf171469d7cCdda0b7641e230e6a4c2eF98779e0e", 100);
        })

        $("#addPoolBtn").on("click",function(){
            var validator = $( "#addPoolForm" ).validate();
			if(!validator.form()){
				return false;
			}    
            
            App.getPoolDetails($("#poolAddress").val());
        })
        //SET all the event listener here

        //FOR CREATE POOL AND FUND POOl, calculate when user enter value

        //FOR WITHDRAW, after user entered amount to withdraw, calculate the value
    },
    retrieveAddedToken: function () {
        var instance;

        App.contracts.dex.deployed().then(function (ins) {
            instance = ins;

            return instance.getAllToken.call();
        }).then(function (data) {
            tokens = data;

            //Check External Token FROM cookie
            //If got then tokens.push();
        });
    },
    swapToken: function (tokenA, tokenB, tokenAmount) {
        if (tokenA == tokenB) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        } else if (tokenAmount <= 0) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        }
        else {
            var instance;

        }
    },
    fundPool: function (tokenA, tokenB, amountA) {
        if (tokenA == tokenB) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        } else if (tokenAmount <= 0) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        }
        else {

        }
    },
    addNewPool: function (tokenA, tokenB, amountA, amountB) {
        if (tokenA == tokenB) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        } else if (amountA <= 0 || amountB <= 0) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        }
        else {

        }
    },
    withdrawFund: function (pool, amount) {
        if (amount <= 0) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        }
        else {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        }
    },
    estWithdrawFund: function (amount) {
        if (amount <= 0) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        }
        else {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        }
    },
    estAddNewPool: function (tokenA,tokenB,amountA,amountB) {
        if (tokenA == tokenB) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        } else if (amountA <= 0 || amountB <= 0) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        }
        else {

        }
    },
    estFundPool: function (tokenA,tokenB,tokenAmount) {
        if (tokenA == tokenB) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        } else if (tokenAmount <= 0) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        }
        else {

        }
    },
    estSwap: function (tokenA, tokenB, amount) {        
        if (tokenA == tokenB) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        } else if (amount <= 0) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        }
        else {
            var instance;

            App.contracts.dex.deployed().then(function (ins) {
                instance = ins;
                return instance.isPoolExist.call(tokenA, tokenB).catch(
                    function (e) {
                        Notiflix.Notify.failure(e.data.message);
                    });
            }).then(function (result) {
                Notiflix.Notify.info(result);
            }).catch(function (e) {
                Notiflix.Notify.failure(e.data.message);
            });
        }
    },
    checkPoolAvailability: function (tokenA, tokenB) {
        if (tokenA == tokenB) {
            Notiflix.Notify.warning("Invalid Request");
            return false;
        }
        else {
            var instance;

            App.contracts.dex.deployed().then(function (ins) {
                instance = ins;
                return instance.isPoolExist.call(tokenA, tokenB).catch(
                    function (e) {
                        Notiflix.Notify.failure(e.data.message);
                    });
            }).then(function (result) {
                Notiflix.Notify.info("Result returned: " + result);
            }).catch(function (e) {
                Notiflix.Notify.failure(e.data.message);
            });
        }
    },
    checkBalances: function (token, amount) {
        if (amount <= 0 || token == "") {
            Notiflix.Notify.warning("Invalid Request");
            return false;
        }
        else {
            var instance;
            
            App.contracts.dex.deployed().then(function (ins) {
                instance = ins;
                return instance.checkBalances.call(token, amount,{from:ethereum.selectedAddress}).catch(
                    function (e) {
                        console.log(e)
                        Notiflix.Notify.failure(e.data.message);
                    });
            }).then(function (result) {
                Notiflix.Notify.info("Result returned: " + result);
            }).catch(function (e) {
                console.log(e)
                Notiflix.Notify.failure(e);
            });        
        }
    },
    getPoolDetails:function(pool){
        if(pool == ""){
            Notiflix.Notify.warning("Invalid Request");
            return false;
        }
        else {
            var instance;
            
            App.contracts.dex.deployed().then(function (ins) {
                instance = ins;                
                return instance.liquidityPool(pool).catch(
                    function (e) {
                        console.log(e)
                        Notiflix.Notify.failure(e.data.message);
                    });
            }).then(function (result) {
                if(!result[5]){
                    Notiflix.Notify.info("Pool Not Found.");
                }
                else{
                    var pool = {};
                    var tokenA = result[1];                   ;
                    var tokenB = result[2];
                    
                    pool["poolName"] = "";
                    pool["tokenA"] = "";
                    pool["tokenB"] = "";
                    pool["balanceA"] = result[3];
                    pool["balanceB"] = result[4];
                    pool["poolAddress"] = pool;
                }
                
            }).catch(function (e) {
                console.log(e)
                Notiflix.Notify.failure(e);
            });  
            
            App.contracts.token.at("0xf171469d7cCdda0b7641e230e6a4c2eF98779e0e").then(function (ins) {
                instance = ins;
                return instance.symbol.call();
            }).then(function (data) {
                console.log(data.toNumber());
            });

            // //Example To call token value
            // App.contracts.token.at("0xf171469d7cCdda0b7641e230e6a4c2eF98779e0e").then(function (ins) {
            //     instance = ins;
            //     return instance.totalSupply.call();
            // }).then(function (data) {
            //     console.log(data.toNumber());
            // });
        }
    }
}

$(function () {
    $(window).on('load', function () {
        App.init();
    });
});

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for(let i = 0; i <ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        return c.substring(name.length, c.length);
      }
    }
    return "";
  }

function setCookie(data){
  const d = new Date();
  d.setTime(d.getTime() + (24*60*60*1000));
   
  var expires = "expires="+ d.toUTCString();
  var path = "path=/";
  
  document.cookie = "tokens=" + JSON.stringify(data) + "; " + expires + "; " + path;
}

function createPoolRecord(data){
    var html = "";

    html += "<li class='list-group-item'>";
    html += "<div>"
    html += "<div class='heading'>";
    html += "<h4>" + data.poolName + "</h4>";
    html += "</div>";
    html += "<div class='body'>";
    html += "<div class='input-group input-group-lg mb-3'>"
    html += "<span class='input-group-text'>" + data.tokenA + "</span>";
    html += "<input type='text' disabled class='form-control' value='" + data.balanceA + "'/>";
    html += "</div>";
    html += "<div class='input-group input-group-lg mb-3'>"
    html += "<span class='input-group-text'>" + data.tokenB + "</span>";
    html += "<input type='text' disabled class='form-control' value='" + data.balanceB + "'/>";
    html += "</div>";
    html += "<div class='footer text-center'>"
    html += "<button class='btn btn-primary text-uppercase' data-pool='" + data.poolAddress + "' data-bs-toggle='modal' data-bs-target='#withdrawModal'><span class='fa fa-wallet'></span> Withdraw</button>";
    html += "</div>";
    html += "</div>";
    html += "</div>";
    html += "</li>";

    return html;
}
