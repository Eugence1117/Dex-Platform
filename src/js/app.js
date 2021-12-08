App = {
    web3Provider: null,
    contracts: {},
    blockchainAddress: "http://localhost:7575",    
    tokens: new Map(),

    init: async function () {
        var tokensBuffer;
        //Retrieve Token
        const cookie = getCookie("tokens")
        if(cookie == ""){
            $.getJSON('../token.json', function(data) {   
                tokensBuffer = data;
                setCookie(data,"tokens");
            });
        }
        else{
            tokensBuffer = JSON.parse(cookie);
        }
        
        var html = "";
        for(var i = 0 ; i < tokensBuffer.length; i++){            
            html += "<option value='" + tokensBuffer[i].address + "'>"+tokensBuffer[i].symbol+"</option>";
            App.tokens.set(tokensBuffer[i].address,tokensBuffer[i]);
        }
        $(".token").html(html);        
        $(".token").each(function(){
            $(this).val(tokensBuffer[$(this).data("index")].address);
            $(this).data("prev",$(this).val());
        })
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
        }).then(function(){
            //Only Show Pool after make connection to contract
            App.refreshPool().then(function(){
                const cookie = getCookie("pools")
                if(cookie != ""){
                    const pools = JSON.parse(cookie);      
                    $("#poolGroup").html("");
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
                $("#refreshPoolBtn .fas").removeClass("spin");
            }); 
        });

        $.getJSON('ERC20Interface.json', function (data) {
            var artifact = data;
            App.contracts.token = TruffleContract(artifact);                        
            App.contracts.token.setProvider(App.web3Provider);
            //return App.retrieveAddedToken();
        });    
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

        $("#refreshPoolBtn").on('click',function(){
            App.refreshPool().then(function(){
                const cookie = getCookie("pools")
                if(cookie != ""){
                    const pools = JSON.parse(cookie);      
                    $("#poolGroup").html("");
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
                $("#refreshPoolBtn .fas").removeClass("spin");
            });            
        })

        $("#addPoolBtn").on("click",function(){
            var validator = $( "#addPoolForm" ).validate();
			if(!validator.form()){
				return false;
			}    
            
            App.importPool($("#poolAddress").val(),true);
        })

        $("#fundBtn").on("click",function(e){
            e.preventDefault();

            var validator = $( "#addForm" ).validate();
			if(!validator.form()){
				return false;
			}                
        });
        
        $("#newForm input[name=tokenAVal]").on('input',function(){
            console.log("test");
            var validator = $( "#newForm" ).validate();
			if(!validator.form()){
				return false;
			}
            
            const tokenAVal = $(this).val();
            const tokenBVal = $("#newForm input[name=tokenBVal]").val();
            
            var amountA = tokenAVal/tokenBVal;
            var amountB = tokenBVal/tokenAVal;

            var tokenA = App.tokens.get($("#newForm select[name=tokenA").val());     
            var tokenB = App.tokens.get($("#newForm select[name=tokenB").val());
            //Show Token A Value
            $("#newForm .ratioAB").text(amountA.toFixed(tokenA.decimal));
            $("#newForm .ratioBA").text(amountB.toFixed(tokenB.decimal));
        })

        $("#newForm input[name=tokenBVal").on('input',function(){
            var validator = $( "#newForm" ).validate();
			if(!validator.form()){
				return false;
			}              

            const tokenAVal = $("#newForm input[name=tokenAVal]").val();
            const tokenBVal = $(this).val();

            var amountA = tokenAVal/tokenBVal;
            var amountB = tokenBVal/tokenAVal;

            var tokenA = App.tokens.get($("#newForm select[name=tokenA").val());     
            var tokenB = App.tokens.get($("#newForm select[name=tokenB").val());
            //Show Token A Value
            $("#newForm .ratioAB").text(amountA.toFixed(tokenA.decimal));
            $("#newForm .ratioBA").text(amountB.toFixed(tokenB.decimal));
        })

        $("#createBtn").on("click",function(e){
            e.preventDefault();
            var validator = $( "#newForm" ).validate();
			if(!validator.form()){
				return false;
			}  

            var tokenA = $("#newForm select[name=tokenA").val();     
            var tokenB = $("#newForm select[name=tokenB").val();
            const tokenAVal = $("#newForm input[name=tokenAVal]").val() * (10 ** App.tokens.get(tokenA).decimal);
            const tokenBVal = $("#newForm input[name=tokenBVal]").val() * (10 ** App.tokens.get(tokenB).decimal);
            

            App.addNewPool(tokenA,tokenB,tokenAVal,tokenBVal);
        });
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
            var instance;
            App.contracts.dex.deployed().then(function (ins) {
                instance = ins;
                return instance.isPoolExist.call(tokenA, tokenB);                    
            }).then(function (result) {
                var isExist = result[0];
                var poolId = result[1];                
                if(!isExist){     
                    return App.addToken(tokenA,tokenB).then(result => {
                        return App.authorizeContract(tokenA,tokenB,amountA,amountB).then(result => {
                            if(result){
                                return instance.addLiquidityPool(tokenA,tokenB,amountA,amountB,{from:ethereum.selectedAddress}).then(result =>{
                                    return poolId;
                                });
                            }
                            else{
                                Notiflix.Notify.failure("Error occured when authorizing contract.");
                                return null;
                            }                                                
                        })
                    });                
                }
                else{
                    console.log("Pool ID" + poolId);
                    Notiflix.Notify.failure("Pool already exist.");
                    return null;
                }                
            }).then(function(poolAddress){
                console.log(poolAddress);
                if(poolAddress != null){

                    console.log(poolAddress);
                    App.importPool(poolAddress,false);                    
                }
            }).catch(function (e) {
                console.log(e);
                if(e.code == 4001){
                    Notiflix.Notify.failure("Action cancelled due to user rejected the transaction.");
                }                
                else{
                    Notiflix.Notify.failure("Unexpected error occured. Please try again later.");
                }
            });            
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
    refreshPool:async function(){
        if(poolAddress == ""){
            Notiflix.Notify.warning("Invalid Request");
            return false;
        }else{
            var instance;
            $("#refreshPoolBtn .fas").addClass("spin");
            App.contracts.dex.deployed().then(function (ins) {
                instance = ins;
            }).then(async function(){
                var cookie = getCookie("pools");
                if (cookie != "") {
                    var pools = JSON.parse(cookie);
                    for (var i = 0; i < pools.length; i++) {
                        var pool = await instance.liquidityPool(pools[i].poolAddress);

                        var balanceA = pool[3];
                        var balanceB = pool[4];

                        var tokenADecimal = pools[i].balanceA.toString().split(".")[1].length || 0;
                        var tokenBDecimal = pools[i].balanceB.toString().split(".")[1].length || 0;

                        pools[i].balanceA = (balanceA / (10 ** tokenADecimal)).toFixed(tokenADecimal);
                        pools[i].balanceB = (balanceB / (10 ** tokenBDecimal)).toFixed(tokenBDecimal);
                    }
                    setCookie(pools,"pools")                
                }                
            });                    
        }
    },
    importPool:function(poolAddress,notify){
        if(poolAddress == ""){
            Notiflix.Notify.warning("Invalid Request");
            return false;
        }
        else {
            var instance;
            
            App.contracts.dex.deployed().then(function (ins) {
                instance = ins;                
                return instance.liquidityPool(poolAddress);
            }).then(function (result) {
                if(!result[5]){
                    Notiflix.Notify.info("Pool Not Found.");
                }
                else{
                    var pool = {};
                    var poolToken = result[0];                                        
                    var tokenA = result[1];
                    var tokenB = result[2];                    
                    console.log("Pool Token" + poolToken);
                    App.addToken(poolToken);

                    pool["balanceA"] = result[3];
                    pool["balanceB"] = result[4];
                    pool["poolAddress"] = poolAddress;
                    
                    App.contracts.token.at(tokenA).then(async function (ins) {
                        instance = ins;                        
                        var symbol = await instance.symbol.call();      
                        var decimal = await instance.decimals.call();  
                        
                        var info = {};
                        info.symbol = symbol;
                        info.decimal = decimal.toNumber();

                        return info;
                    }).then(function (result) {
                        console.log(result);
                        pool["tokenA"] = result.symbol;
                        pool["poolName"] = result.symbol;
                        pool["balanceA"] = (pool["balanceA"] / 10 **result.decimal).toFixed(result.decimal);                    

                        App.contracts.token.at(tokenB).then(async function (ins) {
                            instance = ins;
                            var symbol = await instance.symbol.call();      
                            var decimal = await instance.decimals.call();

                            var info = {};
                            info.symbol = symbol;
                            info.decimal = decimal.toNumber();

                            return info;           
                        }).then(function (result) {
                            console.log(result);
                            pool["tokenB"] = result.symbol;
                            pool["poolName"] += " / " + result.symbol;
                            pool["balanceB"] = (pool["balanceB"] / 10 **result.decimal).toFixed(result.decimal);  

                            const cookie = getCookie("pools")

                            var pools = [];
                            var isAdded = false;
                            if(cookie != ""){
                                pools = JSON.parse(cookie);
                                for(var i = 0 ; i < pools.length; i++){
                                    if(pools[i].poolAddress == pool.poolAddress){
                                        pools[i].balanceA = pool.balanceB;
                                        pools[i].balanceB = pool.balanceB;
                                        isAdded = true;
                                    }
                                }
                            }

                            if(!isAdded){
                                pools.push(pool);
                            }
                            else{
                                if(notify){
                                    Notiflix.Notify.info("Pool already added.");
                                }
                            }
                                                        
                            setCookie(pools,"pools");

                            $("#poolGroup").html("");
                            for(var i = 0 ; i < pools.length;i++){
                                 $("#poolGroup").append(createPoolRecord(pools[i]))                
                            }
                    
                            if(pools.length == 0){
                                $("#poolGroup").html("<div class='list-group-item'><p class='text-center p-2'>No Pool Available</p></div>");
                            }
                        });
                    }).catch(function(e){
                        console.error("Invalid Token");
                    });                                                         
                }
                
            }).catch(function (e) {
                console.log(e)
                Notiflix.Notify.failure(e);
            });                          
        }
    },
    importToken:function(token){
        if(token == ""){
            Notiflix.Notify.warning("Invalid Request");
            return false;
        }
        else{
            return App.contracts.token.at(token).then(async function (ins) {
                instance = ins;           

                try{
                    var symbol = await instance.symbol.call();    
                    var decimal = await instance.decimals.call();
                    var name = await instance.name.call();
                    
                    var objToken = {};
                    objToken.symbol = symbol;
                    objToken.decimal = decimal;
                    objToken.name = name;
                    objToken.address = token;

                    var cookie = getCookie("tokens");
                    var tokens = [];
                    if(cookie != ""){
                        tokens = JSON.parse(cookie);

                        var isFound = false;
                        for(var i = 0 ; i < tokens.length; i++){
                            if(tokens[i].address == token){
                                isFound = true;
                            }
                        }
                    }
                    if(!isFound){
                        tokens.push(objToken);
                    }                    
                    setCookie(tokens,"tokens")
                    App.tokens.set(token,objToken);

                    return objToken;
                }
                catch(e){
                    console.error(e);
                    return null;
                }
            });
        }
    },
    addToken:async function(token){
        if(token == ""){
            Notiflix.Notify.warning("Invalid Request");
            return false;
        }
        else{
            var cookie = getCookie("registry");
            if(cookie != ""){
                var tokens = JSON.parse(cookie);
                var isFound = false;
                for(var i = 0 ; i < tokens.length;i++){
                    var t = tokens[i];
                    if(token == t){
                        isFound = true;
                    }
                }

                if(!isFound){
                    var t = App.tokens.get(token);   
                    console.log("Before"+t);
                    if(typeof t == "undefined"){
                        t = await importToken(token);
                    }
                    console.log("After"+t);
                    if(t != null){
                        var isSuccess = await App.web3Provider.request({
                            method: 'wallet_watchAsset',
                            params:{
                                type: 'ERC20',
                                    options: {
                                        address: token,
                                        symbol: t.symbol,
                                        decimals: t.decimal,
                                        image: '',
                                },                    
                            }
                        })
                        
                        if(isSuccess){
                            tokens.push(token);
                        }
                        return isSuccess;
                    }
                    else{
                        return false;
                    }
                }
            }
            else{
                var tokens = []
            }
        }
    },
    addToken:async function(tokenA, tokenB){
        if(tokenA == tokenB || tokenA == "" || tokenB == ""){
            Notiflix.Notify.warning("Invalid Request");
            return false;
        }
        else{
            var cookie = getCookie("registry");
            if(cookie != ""){
                var tokens = JSON.parse(cookie);

                var istokenAFound = false;
                var istokenBFound = false;
                for(var i = 0 ; i < tokens.length;i++){
                    var token = tokens[i];
                    if(token == tokenA){
                        istokenAFound = true;
                    }
                    else if(token == tokenB){
                        istokenBFound = true;
                    }
                }
                if(!istokenAFound && !istokenBFound){
                    const tokenAObj = App.tokens.get(tokenA);
                    const tokenBObj = App.tokens.get(tokenB);           

                    var isASuccess = await App.web3Provider.request({
                        method: 'wallet_watchAsset',
                        params:{
                            type: 'ERC20',
                                options: {
                                    address: tokenA,
                                    symbol: tokenAObj.symbol,
                                    decimals: tokenAObj.decimal,
                                    image: '',
                            },                    
                        }
                    })

                    if(isASuccess){
                        tokens.push(tokenA);
                    }
                    
                    var isBSuccess = await App.web3Provider.request({
                        method: 'wallet_watchAsset',
                        params:{
                            type: 'ERC20',
                                options: {
                                    address: tokenB,
                                    symbol: tokenBObj.symbol,
                                    decimals: tokenBObj.decimal,
                                    image: '',
                            },                    
                        }
                    })

                    if(isBSuccess){
                        tokens.push(tokenB);
                    }
                    return isASuccess && isBSuccess;
                }
                else if(!istokenAFound){
                    const tokenAObj = App.tokens.get(tokenA);

                    var isSuccess = await App.web3Provider.request({
                        method: 'wallet_watchAsset',
                        params:{
                            type: 'ERC20',
                                options: {
                                    address: tokenA,
                                    symbol: tokenAObj.symbol,
                                    decimals: tokenAObj.decimal,
                                    image: '',
                            },                    
                        }
                    })

                    if(isSuccess){
                        tokens.push(tokenA);
                    }
                    return isSuccess;
                }
                else if (!istokenBFound){
                    const tokenBObj = App.tokens.get(tokenB); 
                    var isSuccess = await App.web3Provider.request({
                        method: 'wallet_watchAsset',
                        params:{
                            type: 'ERC20',
                                options: {
                                    address: tokenB,
                                    symbol: tokenBObj.symbol,
                                    decimals: tokenBObj.decimal,
                                    image: '',
                            },                    
                        }
                    })
                    
                    if(isSuccess){
                        tokens.push(tokenB);
                    }
                    setCookie(tokens,"registry");

                    return isSuccess
                }
                else{
                    //Refresh Cookie
                    setCookie(tokens,"registry");

                    return true;                    
                }                
            }
            else{
                var tokens = [];
                const tokenAObj = App.tokens.get(tokenA);
                const tokenBObj = App.tokens.get(tokenB);           

                var isASuccess = await App.web3Provider.request({
                    method: 'wallet_watchAsset',
                    params:{
                        type: 'ERC20',
                            options: {
                                address: tokenA,
                                symbol: tokenAObj.symbol,
                                decimals: tokenAObj.decimal,
                                image: '',
                        },                    
                    }
                })

                var isBSuccess = await App.web3Provider.request({
                    method: 'wallet_watchAsset',
                    params:{
                        type: 'ERC20',
                            options: {
                                address: tokenB,
                                symbol: tokenBObj.symbol,
                                decimals: tokenBObj.decimal,
                                image: '',
                        },                    
                    }
                })

                if(isASuccess){
                    tokens.push(tokenA);
                }                               

                if(isBSuccess){
                    tokens.push(tokenB);
                }

                setCookie(tokens,"registry");

                return isASuccess && isBSuccess;
            }                        
        }
    },
    authorizeContract:async function(tokenA,tokenB,amountA,amountB){
        if(tokenA == "" || amountA <= 0 || tokenB == "" || amountB <= 0){
            Notiflix.Notify.warning("Invalid Request");
            return false;
        }
        else{
            const contractAddress = await App.contracts.dex.deployed().then(function(ins){
                return ins.address;
            })                      

            try{
                console.log(amountA);
                const isAapprove = await App.contracts.token.at(tokenA).then(async function (ins) {                      
                    if((await ins.allowance.call(ethereum.selectedAddress,contractAddress)).toNumber() <= amountA){
                        return ins.approve(contractAddress,amountA,{'from': ethereum.selectedAddress});            
                    }           
                    else{
                        return true;
                    }                                                               
                })         
                console.log(amountB);
                const isBapprove = await App.contracts.token.at(tokenB).then(async function (ins) { 
                    if((await ins.allowance.call(ethereum.selectedAddress,contractAddress)).toNumber() <= amountB){
                        return ins.approve(contractAddress,amountB,{'from': ethereum.selectedAddress}); 
                    }           
                    else{
                        return true;
                    }                                                  
                })

                return isAapprove && isBapprove;
            }
            catch(e){
                console.error(e);
                return false;
            }            
        }
    }
    ,
    calculateRatio:function(token1, token2){
        if(token1 == token2 || token1 == "" || token2 == ""){
            Notiflix.Notify.warning("Invalid Request");
            return false;
        }
        else{
            var instance;
            
            App.contracts.dex.deployed().then(function (ins) {
                instance = ins;
                return instance.isPoolExist.call(token1,token2);
            }).then(function (result) {
                console.log(result);
                var isExist = result[0];
                var poolId = result[1];
                if(isExist){
                    const cookie = getCookie("tokens")
                    if(cookie == ""){
                        $.getJSON('../token.json', function(data) {   
                            tokensBuffer = data;
                            setCookie(data,"token");
                        });
                    }
                    else{
                        tokensBuffer = JSON.parse(cookie);
                    }
                }
                else{
                    //Show no pool
                }                
            }).catch(function (e) {
                console.log(e)
                Notiflix.Notify.failure(e);
            }); 
        }
    }
}

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

function setCookie(data,name){
  const d = new Date();
  d.setTime(d.getTime() + (24*60*60*1000));
   
  var expires = "expires="+ d.toUTCString();
  var path = "path=/";
  
  document.cookie = name+ "=" + JSON.stringify(data) + "; " + expires + "; " + path;
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
