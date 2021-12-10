App = {
    web3Provider: null,
    contracts: {},
    blockchainAddress: "http://localhost:7575",    
    tokens: new Map(),
    balance:new Map(),

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

            App.retrieveTokenBalance.call();
            $("select[name=tokenA]").on("change",App.retrieveTokenBalance);
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
        var previousToken = null;

        $("input[name=amount]").on('input',async function(){
            var validator = $( "#swapForm" ).validate();
			if(!validator.form()){
				return false;
			} 

            if(!await App.calculateAmount()){
                $(this).attr("disabled",true);
            }else{
                $(this).attr("disabled",false);
            }
        });

        $("select[name=tokenA]").on("change",async function(){
            var validator = $( "#swapForm" ).validate();
			if(!validator.form()){
				return false;
			} 

            App.retrieveTokenBalance();
            if(!await App.calculateAmount()){               
                $("input[name=amount]").attr("disabled",true);
            }
            else{                
                $("input[name=amount]").attr("disabled",false);
            }
        });
        
        $("#btnSwap").on('click',async function(e){            
            e.preventDefault();

            var validator = $( "#swapForm" ).validate();
			if(!validator.form()){
				return false;
			} 

            const tokenA = $("select[name=tokenA]").val();  
            const tokenB = $("select[name=tokenB").val();
            var amount = $("input[name=amount]").val();

            amount = amount * (10 ** App.tokens.get(tokenA).decimal);
            const balance = await App.getTokenBalance(tokenA);
            App.balance.set(tokenA,balance);

            if(balance < amount){
                Notiflix.Notify.failure("Not enough amount");
            }
            else{
                App.swapToken(tokenA,tokenB,amount);               
            }
        });
    },
    calculateAmount:async function(){
        var validator = $("#swapForm").validate();
        if (!validator.form()) {
            return null;
        }

        const tokenA = $("select[name=tokenA]").val();
        const tokenB = $("select[name=tokenB").val();
        var amount = $("input[name=amount]").val();

        amount = amount * (10 ** App.tokens.get(tokenA).decimal);
        var amountReceived = await App.estSwap(tokenA, tokenB, amount);
        if (amountReceived != null) {
            var average = (amountReceived / amount).toFixed(App.tokens.get(tokenB).decimal);
            $("#exchangeRate").text("1 " + App.tokens.get(tokenA).symbol + " = " + average + " " + App.tokens.get(tokenB).symbol);
            amountReceived = amountReceived / (10 ** App.tokens.get(tokenB).decimal);
            $("input[name=amountReceived]").val(amountReceived);

            return true;
        }
        else if (amountReceived == null) {            
            $("#exchangeRate").text("");
            $("input[name=amountReceived]").val(0);

            return false;
        }
        else{
            return null;
        }
    },
    retrieveTokenBalance : async function(){
        $("#tokenABal").fadeOut(10);
        const tokenA = $("select[name=tokenA]").val();                
        const tokenAObj = App.tokens.get(tokenA);

        const tokenABalance = await App.getTokenBalance(tokenA);
        
        App.balance.set(tokenA,tokenABalance);
        $("#tokenABal").text(tokenABalance / (10 ** tokenAObj.decimal) + " " + tokenAObj.symbol + " (MAX)") 
        $("#tokenABal").fadeIn(200);
    },
    swapToken: async function (tokenA, tokenB, tokenAmount) {
        if (tokenA == tokenB) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        } else if (tokenAmount <= 0) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        }
        else {            
            var instance =  await App.contracts.dex.deployed().then(function (ins) {
                return ins;
            });
            
            try{
                return instance.isPoolExist.call(tokenA,tokenB).then(async function(result) {
                    if(result[0]){
                        Notiflix.Loading.circle("Waiting transaction to finish...");

                        var token = {};
                        token.address = tokenA;
                        token.amount = tokenAmount;
        
                        var tokens = [token];
                        var isSuccess = await App.authorizeContract(tokens);
                        if(isSuccess){
                            await instance.swap(tokenA,tokenB,tokenAmount,{from:ethereum.selectedAddress}).then(function(){
                                Notiflix.Loading.remove();  
                                $("select[name=tokenA]").trigger('change');
                                return Notiflix.Confirm.show(
                                    'Token Swap Successfully',
                                    'Do you want to add the token to your metamask?',
                                    'Yes',
                                    'No',
                                    function okCb() {
                                        App.addNewToken(tokenB);
                                        return true;
                                    },
                                    function cancelCb() {
                                        return true;
                                    },
                                    {
                                    },
                                );  
                            }).catch(function(e){
                                Notiflix.Loading.remove();
                                if(e.code == 4001){
                                    Notiflix.Notify.failure("Action cancelled due to user rejected the transaction.");
                                }                
                                else{
                                    console.log(e);
                                    Notiflix.Notify.failure("Unexpected error occured. Please try again later.");
                                }
                            });                                                     
                        }
                        else{
                            Notiflix.Loading.remove();
                            Notiflix.Notify.failure("Error occured when authorizing contract.");
                            return null;   
                        }
                    }
                    else{
                        Notiflix.Loading.remove();
                        Notiflix.Notify.failure("Pool is not exist.");
                        return false;
                    }
                })            
            }
            catch(e){
                Notiflix.Loading.remove();
                console.error(e);
                Notiflix.Notify.failure("Unexpected error occured. Please try again later.");
                return null;  
            }           
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

            return App.contracts.dex.deployed().then(function (ins) {
                instance = ins;
                return instance.isPoolExist.call(tokenA, tokenB);
            }).then(async function (result) {
                if(result[0]){
                    var poolAddress = result[1];
                    
                    const balance = (await instance.estSwap.call(tokenA,tokenB,amount)).toNumber();
                    return balance;
                }
                else{
                    Notiflix.Notify.failure("Pool Not Exist");
                    return null;
                }                
            }).catch(function (e) {
                Notiflix.Notify.failure(e.data.message);
                return false;
            });
        }
    },   
    importToken:function(token,addToList){
        if(token == ""){
            Notiflix.Notify.warning("Invalid Request");
            return null;
        }
        else{
            try{
                return App.contracts.token.at(token).then(async function (ins) {
                    instance = ins;           
    
                    try{
                        var symbol = await instance.symbol.call();    
                        var decimal = (await instance.decimals.call()).toNumber();
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
                        App.tokens.set(token,objToken);
                        if(addToList){
                            setCookie(tokens,"tokens")                        
                            refreshTokenList();
                        }                    
    
                        return objToken;
                    }
                    catch(e){
                        console.error(e);
                        return null;
                    }
                }).catch(function(e){
                    console.error(e);
                    return null;
                });
            }
            catch(e){
                console.error(e);
                return null;
            }            
        }
    },
    addNewToken:async function(token){
        if(token == ""){
            Notiflix.Notify.warning("Invalid Request");
            return false;
        }
        else{
            var t = await App.importToken(token,true);

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
                
                return isSuccess;
            }
            else{
                return false;
            }                 
        }
    },    
    authorizeContract:async function(tokens){
        if(tokens.length <= 0){
            Notiflix.Notify.warning("Invalid Request");
            return false;
        }
        else{
            const contractAddress = await App.contracts.dex.deployed().then(function(ins){
                return ins.address;
            })                      

            try{               
                var isApprove = true;
                for(var i = 0 ; i < tokens.length ; i++){
                    isApprove = await App.contracts.token.at(tokens[i].address).then(async function (ins) {                                         
                        if((await ins.allowance.call(ethereum.selectedAddress,contractAddress)).toNumber() < tokens[i].amount){
                            return ins.approve(contractAddress,tokens[i].amount,{'from': ethereum.selectedAddress});            
                        }           
                        else{
                            return true;
                        }
                    })                                                         
                }
                return isApprove;
            }
            catch(e){
                console.error(e);
                return false;
            }            
        }
    },
    getTokenBalance:function(tokenAddress){
        return App.contracts.dex.deployed().then(function(ins){
            return ins.checkBalances.call(tokenAddress,{from:ethereum.selectedAddress});
        }).then(result => {
            return result.toNumber();
        }).catch(error => {
            console.error(error);
            return 0;
        })
    },  
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

function refreshTokenList(){
    var cookie = getCookie("tokens");
    if(cookie != ""){
        var tokensBuffer = JSON.parse(cookie);
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
    }        
}

