App = {
    web3Provider: null,
    contracts: {},
    blockchainAddress: "http://localhost:7575",    
    tokens: new Map(),
    pools:new Map(),

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
                        App.pools.set(pools[i].poolAddress,pools[i]);
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
                
                $(".copy").off('click');
                $(".copy").on('click',function(){
                    var poolAddress = $(this).data("pool");
                    navigator.clipboard.writeText(poolAddress);
                    Notiflix.Notify.success("Pool Address copied.");
                });

                $(".withdrawBtn").on('click',withdrawHandler);
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
        $("#refreshPoolBtn").on('click',async function(){
            await App.refreshPool().then(function(){
                const cookie = getCookie("pools");
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
                $(".withdrawBtn").off('click');
                $(".withdrawBtn").on('click',withdrawHandler);

                $(".copy").off('click');
                $(".copy").on('click',function(){
                    var poolAddress = $(this).data("pool");
                    navigator.clipboard.writeText(poolAddress);
                    Notiflix.Notify.success("Pool Address copied.");
                });
                $("#refreshPoolBtn .fas").removeClass("spin");
            });            
        })

        $("#addPoolBtn").on("click",function(){
            var validator = $( "#addPoolForm" ).validate();
			if(!validator.form()){
				return false;
			}    
            
            App.importPool($.trim($("#poolAddress").val()),true);
        })

        $("#addTokenBtn").on("click",async function(){
            var validator = $( "#addTokenForm" ).validate();
			if(!validator.form()){
				return false;
			}    
            
            var token = await App.importToken($("#tokenAddress").val(),true);
            if(token != null){
                Notiflix.Notify.success("Token Added.");
            }
            else{
                Notiflix.Notify.failure("Unable to add token.");
            }
        })

        $("#fundBtn").on("click",async function(e){
            e.preventDefault();

            var validator = $( "#addForm" ).validate();
			if(!validator.form()){
				return false;
			}                
            await calculateFundAmount.call($("#addForm input[name=tokenAVal]"));

            const tokenA = $("#addForm select[name=tokenA]").val();
            const tokenB = $("#addForm select[name=tokenB]").val();

            var valA = $("#addForm input[name=tokenAVal]").val();
            var valB = $("#addForm input[name=tokenBVal]").val();
            
            const tokenAObj = App.tokens.get(tokenA);
            valA = valA * (10 ** tokenAObj.decimal);
            
            const tokenBObj = App.tokens.get(tokenB);
            valB = valB * (10 ** tokenBObj.decimal);
            
            App.fundPool(tokenA,tokenB,valA,valB);            
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
        
        $("#withdrawModal").on('hidden.bs.modal',function(){
            $("#withdrawBtn").off('click');
            $("input[name=tokenCount]").off('change');
            $("#rangeValue").text("0 ");
            $("input[name=tokenCount]").val(0);
            $("#tokenSpend").text("0 LPT");
            $("#withdrawModal .tokenA").text("Token A");
            $("#withdrawModal .tokenB").text("Token B");
            $("#withdrawModal .tokenAVal").text("0");
            $("#withdrawModal .tokenBVal").text("0");
        })

        var calculateFundAmount = async function(){  
            var tokenAAddress = $(this).siblings('.token').val();
            var tokenAmount = $(this).val();
            
            if(tokenAmount != "" && tokenAmount > 0){                
                var tokenElement = $(this).siblings('.token').attr('name');
                var tokenBVal = null;
                var tokenBAddress = null;
                $("#addForm select").each(function(){
                    if($(this).attr('name') != tokenElement){
                        tokenBAddress = $(this).val()  
                        tokenBVal = $(this).siblings("input");
                    }                
                })

                const tokenA = App.tokens.get(tokenAAddress);
                var result = await App.estFundPool(tokenAAddress,tokenBAddress,tokenAmount * (10 ** tokenA.decimal));
                if(result != null){                    
                    const tokenB = App.tokens.get(tokenBAddress);
                    const tokenBAmount = (result[0].toNumber() / (10 ** tokenB.decimal))
                    tokenBVal.val(tokenBAmount);
                    $("#addForm .percentage").text((result[1].toNumber() / 100).toFixed(2) + " %")
                    
                    if(tokenBVal.attr('name') == "tokenBVal"){
                        //A B
                        $("#addForm .ratioAB").text((tokenAmount / tokenBAmount).toFixed(tokenA.decimal));
                        $("#addForm .ratioBA").text((tokenBAmount / tokenAmount).toFixed(tokenB.decimal));
                    }
                    else{
                        //B A
                        $("#addForm .ratioBA").text((tokenAmount / tokenBAmount).toFixed(tokenA.decimal));
                        $("#addForm .ratioAB").text((tokenBAmount / tokenAmount).toFixed(tokenB.decimal));
                    }
                    $("#fundBtn").attr("disabled",false);
                }
                else{
                    $("#addForm input").val("");
                    $("#addForm .ratioBA").text(0);
                    $("#addForm .ratioAB").text(0);
                    $("#addForm .percentage").text((0).toFixed(2) + " %")
                }
            }
            else{
                $("#addForm input").val("");
                $("#addForm .percentage").text((0).toFixed(2) + " %")

                $("#fundBtn").attr("disabled",true);
            }           
        }
        
        $("#addForm input[name=tokenAVal]").on('input',calculateFundAmount);
        $("#addForm input[name=tokenBVal]").on('input',calculateFundAmount);
        $("#addForm select").on('change',function(){
            var inputElement = $(this).siblings('input');
            inputElement.trigger('input');
        });

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
    fundPool: async function (tokenA, tokenB, amountA, amountB) {
        if (tokenA == tokenB || tokenA == "" || tokenB == "") {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        } else if (amountA <= 0 || amountB <= 0) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        }
        else {                        
            var tokens = [];

            var token = {};
            token.address = tokenA;
            token.amount = amountA;
            tokens.push(token);

            token = {};
            token.address = tokenB;
            token.amount = amountB;
            tokens.push(token);

            try{
                const instance = await App.contracts.dex.deployed().then(function(ins){
                    return ins;
                })
 
                instance.isPoolExist(tokenA,tokenB).then(async function(result){
                    var isExist = result[0];
                    var poolId = result[1];
                    if(isExist){
                        var tokenAbalance = (await instance.checkBalances.call(tokenA,{from:ethereum.selectedAddress})).toNumber();
                        var tokenBbalance = (await instance.checkBalances.call(tokenB,{from:ethereum.selectedAddress})).toNumber();

                        if(tokenAbalance >= amountA && tokenBbalance >= amountB){
                            Notiflix.Loading.circle("Waiting the transaction to finish...");

                            await App.authorizeContract(tokens).then(async function(result) {
                                if(result){                        
                                    var isSuccess = await App.contracts.dex.deployed().then(function(ins){
                                        return ins.fundLiquidityPool(tokenA,tokenB,amountA,{from:ethereum.selectedAddress}).then(result => {
                                            return true;
                                        })
                                    });
                                    Notiflix.Loading.remove(); 
                                    if(poolId != null){
                                        await App.importPool(poolId,false);                    
                                    }                    
                                }
                                else{
                                    Notiflix.Loading.remove();
                                    Notiflix.Notify.failure("Error occured when authorizing contract.");
                                    return null;                
                                }                   
                            })
                            .catch(function(error){
                                Notiflix.Loading.remove();
                                if(e.code == 4001){
                                    Notiflix.Notify.failure("Action cancelled due to user rejected the transaction.");
                                }                
                                else{
                                    Notiflix.Notify.failure("Unexpected error occured. Please try again later.");
                                }
                            }); 
                        } 
                        else{
                            Notiflix.Loading.remove(); 
                            Notiflix.Notify.failure("Not enough balance to perform this action.");
                        }                        
                    }
                    else{
                        Notiflix.Loading.remove(); 
                        Notiflix.Notify.failure("Pool is not exist.");
                    }
                })                                               
            }
            catch(e){
                Notiflix.Loading.remove();
                console.error(e)
            };                      
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
            }).then(async function (result) {
                var isExist = result[0];
                var poolId = result[1];                
                if(!isExist){                        
                    var tokens = [];

                    var token = {};
                    token.address = tokenA;
                    token.amount = amountA;

                    tokens.push(token);

                    token = {};
                    token.address = tokenB;
                    token.amount = amountB;
                    tokens.push(token);

                    var tokenAbalance = (await instance.checkBalances.call(tokenA,{from:ethereum.selectedAddress})).toNumber();
                    var tokenBbalance = (await instance.checkBalances.call(tokenB,{from:ethereum.selectedAddress})).toNumber();

                    if(tokenAbalance >= amountA && tokenBbalance >= amountB){
                        Notiflix.Loading.circle("Waiting the transaction to finish...");
                        return App.authorizeContract(tokens).then(async function(result){
                            if(result){
                                return await instance.addLiquidityPool(tokenA,tokenB,amountA,amountB,{from:ethereum.selectedAddress}).then(result =>{
                                    Notiflix.Loading.remove();      
                                    Notiflix.Notify.success("Pool created.");                                                                           
                                    return poolId;
                                });                                
                            }
                            else{
                                Notiflix.Loading.remove();                                             
                                Notiflix.Notify.failure("Error occured when authorizing contract.");
                                return null;
                            }                               
                        });                              
                    }                    
                    else{
                        Notiflix.Loading.remove(); 
                        Notiflix.Notify.failure("Not enough balance to perform this action.");
                        return null;
                    }
                }
                else{
                    console.log("Pool ID" + poolId);
                    Notiflix.Notify.failure("Pool already exist.");
                    return null;
                }                
            }).then(async function(poolAddress){
                if(poolAddress != null){
                    await App.importPool(poolAddress,false);                    
                }
            }).catch(function (e) {
                Notiflix.Loading.remove();   
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
    withdrawFund: async function (poolAddress, amount) {
        if (amount <= 0) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return false;
        }
        else {
            const pool = App.pools.get(poolAddress);

            const poolToken = pool.poolToken;

            var token = {};            

            token.amount = amount;
            token.address = poolToken;
            var tokens = [token];            

            Notiflix.Loading.circle("Waiting the transaction to finish...");
            try{                
                var isSuccess = await App.authorizeContract(tokens);
                if(isSuccess){
                    var dexInstance = await App.contracts.dex.deployed().then(function(ins){
                        return ins;
                    });

                    await dexInstance.withdrawFund(poolAddress,amount,{from:ethereum.selectedAddress});

                    Notiflix.Loading.remove();
                    Notiflix.Notify.success("Fund withdraw successfully.");
                    $("#withdrawModal").modal("hide");
                }
            }
            catch(e){
                Notiflix.Loading.remove();
                Notiflix.Notify.failure("Unexpected error occured.");                
                console.log(e);
            }
        
        }
    },
    estWithdrawFund: async function (poolAddress) {
        Notiflix.Loading.circle("Fetching Pool Details...");
        var dexInstance = await App.contracts.dex.deployed().then(function(ins){
            return ins;
        });

        const pool = App.pools.get(poolAddress);
        var balances = (await dexInstance.checkBalances.call(pool.poolToken,{from:ethereum.selectedAddress})).toNumber();
        if(typeof App.tokens.get(pool.poolToken) == "undefined"){
            await App.importToken(pool.poolToken,false);
        }
        const token = App.tokens.get(pool.poolToken);

        balances = balances / (10 ** token.decimal);
        
        const defaultValue = (0).toFixed(token.decimal);

        $("input[name=tokenCount]").val(0);
        $("#rangeValue").text("0 ");
        $("#tokenSpend").text(defaultValue + " " + token.symbol);
        
        if(typeof App.tokens.get(pool.addressTokenA) == "undefined"){
            await App.importToken(pool.addressTokenA,false);
        }
        const tokenA = App.tokens.get(pool.addressTokenA);

        if(typeof App.tokens.get(pool.addressTokenB) == "undefined"){
            await App.importToken(pool.addressTokenB,false);
        }
        const tokenB = App.tokens.get(pool.addressTokenB);

        $("#withdrawModal .tokenA").text(tokenA.symbol);
        $("#withdrawModal .tokenB").text(tokenB.symbol);
        $("#withdrawModal .tokenAVal").text((0).toFixed(tokenA.decimal));
        $("#withdrawModal .tokenBVal").text((0).toFixed(tokenB.decimal)); 

        Notiflix.Loading.remove();
        $("#withdrawModal").modal("show");

        var tokenSpend = 0;
        $("input[name=tokenCount]").on('change',async function(){
            tokenSpend = (balances * $(this).val() / 100).toFixed(token.decimal);
            $("#tokenSpend").text(tokenSpend + " " + token.symbol);

            
            var result = await dexInstance.estWithdrawFund.call(poolAddress,tokenSpend * (10 ** token.decimal));
            var tokenAamount = result[0].toNumber();
            var tokenBamount = result[1].toNumber();

            $("#withdrawModal .tokenAVal").text((tokenAamount / (10 ** tokenA.decimal)).toFixed(tokenA.decimal));
            $("#withdrawModal .tokenBVal").text((tokenBamount / (10 ** tokenB.decimal)).toFixed(tokenB.decimal));             
        });

        $("#withdrawBtn").on('click',function(){    
            var tokenToUse = tokenSpend * (10 ** token.decimal);            
            if(tokenToUse == 0){
                Notiflix.Notify.failure("Please make sure token to withdraw is more than 0.");
            }
            else{
                App.withdrawFund(poolAddress,tokenToUse);
            }
        })
    },
    estFundPool: async function (tokenA,tokenB,tokenAmount) {
        if (tokenA == tokenB) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return null;
        } else if (tokenAmount <= 0) {
            Notiflix.Notify.warning("Invalid Request. Validation Needed");
            return null;
        }
        else {
            try{
                var instance = await App.contracts.dex.deployed().then(function(ins){
                    return ins;
                });
    
                return instance.isPoolExist.call(tokenA,tokenB).then(result => {
                    if(!result[0]){
                        Notiflix.Notify.failure("Pool is not created.");
                        return null;
                    }
                    else{
                        var poolAddress = result[1];
                        return instance.estFundPool.call(tokenA,tokenB,tokenAmount).then(result =>{
                            return result;
                        })                        
                    }
                })
            }   
            catch(error){
                console.error(error);
                Notiflix.Notify.failure("Unexpected error occured. Please try again later.");
                return null;
            }
        }
    },
    refreshPool:async function(){
        if(poolAddress == ""){
            Notiflix.Notify.warning("Invalid Request");
            return false;
        }else{
            var instance;
            $("#refreshPoolBtn .fas").addClass("spin");
            $("#refreshPoolBtn").attr("disabled",true);
            await App.contracts.dex.deployed().then(function (ins) {
                instance = ins;
            }).then(async function(){
                var cookie = getCookie("pools");
                if (cookie != "") {
                    var pools = JSON.parse(cookie);
                    for (var i = 0; i < pools.length; i++) {
                        var pool = await instance.liquidityPool(pools[i].poolAddress);
                        var tokenAddress = pool[0]
                        var balanceA = pool[3];
                        var balanceB = pool[4];

                        var tokenADecimal = pools[i].balanceA.toString().split(".")[1].length || 0;
                        var tokenBDecimal = pools[i].balanceB.toString().split(".")[1].length || 0;

                        pools[i].balanceA = (balanceA / (10 ** tokenADecimal)).toFixed(tokenADecimal);
                        pools[i].balanceB = (balanceB / (10 ** tokenBDecimal)).toFixed(tokenBDecimal);
                        pools[i].poolToken = tokenAddress;

                        App.pools.set(pools[i].poolAddress,pools[i]);
                    }                  
                    $("#refreshPoolBtn .fas").removeClass("spin"); 
                    $("#refreshPoolBtn").attr("disabled",false); 
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
                    Notiflix.Notify.failure("Pool Not Found.");
                }
                else{
                    Notiflix.Loading.circle("Importing Pool...");

                    var pool = {};
                    var poolToken = result[0];                                        
                    var tokenA = result[1];
                    var tokenB = result[2];               

                    pool["balanceA"] = result[3];
                    pool["balanceB"] = result[4];
                    pool["poolAddress"] = poolAddress;
                    pool["poolToken"] = poolToken;
                    pool["addressTokenA"] = tokenA;
                    pool["addressTokenB"] = tokenB;
                    
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
                                        pools[i].balanceA = pool.balanceA;
                                        pools[i].balanceB = pool.balanceB;
                                        isAdded = true;
                                    }
                                }
                            }

                            if(!isAdded){
                                pools.push(pool);
                                App.pools.set(pool.poolAddress,pool);
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
                            $(".withdrawBtn").off('click');
                            $(".withdrawBtn").on('click',withdrawHandler);

                            $(".copy").off('click');
                            $(".copy").on('click',function(){
                                var poolAddress = $(this).data("pool");
                                navigator.clipboard.writeText(poolAddress);
                                Notiflix.Notify.success("Pool Address copied.");
                            });

                            Notiflix.Loading.remove();

                            Notiflix.Confirm.show(
                                'Liquidity Pool has been imported',
                                'Do you want to add the LP token to your metamask?',
                                'Yes',
                                'No',
                                function okCb() {
                                    App.addNewToken(poolToken);
                                },
                                function cancelCb() {
                                },
                                {
                                },
                            ); 
                        });
                    }).catch(function(e){
                        Notiflix.Loading.remove();
                        Notiflix.Notify.failure("Unexpected error occured. Please try again later.");
                        console.error("Invalid Token");
                    });                                                         
                }
                
            }).catch(function (e) {
                console.log(e)
                Notiflix.Notify.failure("Unexpected error occured. Please try again later.");
            });                          
        }
    },
    importToken:function(token,addToList){
        if(token == ""){
            Notiflix.Notify.warning("Invalid Request");
            return null;
        }
        else{
            Notiflix.Loading.circle("Retrieving token information...");
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
                        
                        Notiflix.Loading.remove();
                        return objToken;
                    }
                    catch(e){
                        Notiflix.Loading.remove();
                        Notiflix.Notify.failure("Unexpected error ocurred. Please try again later.")
                        console.error(e);
                        return null;
                    }
                }).catch(function(e){
                    Notiflix.Notify.failure("Unexpected error ocurred. Please try again later.")
                    Notiflix.Loading.remove();
                    console.error(e);
                    return null;
                });
            }
            catch(e){
                Notiflix.Loading.remove();
                Notiflix.Notify.failure("Unexpected error ocurred. Please try again later.")
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
                        t = await App.importToken(token,false); //Avoid Adding to List
                    }
                    console.log(t);
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

                var t = App.tokens.get(token);
                console.log("Before" + t);
                if (typeof t == "undefined") {
                    t = await App.importToken(token,false);//Avoid Adding to List
                }
                console.log(t);
                if (t != null) {
                    var isSuccess = await App.web3Provider.request({
                        method: 'wallet_watchAsset',
                        params: {
                            type: 'ERC20',
                            options: {
                                address: token,
                                symbol: t.symbol,
                                decimals: t.decimal,
                                image: '',
                            },
                        }
                    })

                    if (isSuccess) {
                        tokens.push(token);
                    }
                    return isSuccess;
                }
                else {
                    return false;
                }
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
    },
    checkTokenBalance:function(tokenAddress){
        return App.contracts.dex.deployed().then(function(ins){
            return ins.checkBalances.call(tokenAddress,{from:ethereum.selectedAddress});
        }).then(result => {
            return result.toNumber() > 0;
        }).catch(error => {
            console.error(error);
            return false;
        })
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

async function withdrawHandler(){
    var poolAddress = $(this).data("pool");

    var pool = App.pools.get(poolAddress);
    var isProvider = await App.checkTokenBalance(pool.poolToken);
    if(isProvider){
        App.estWithdrawFund(poolAddress);
    }   
    else{
        Notiflix.Notify.failure("You are not entitled to withdraw since there is no any balance you earned from this pool.");
    }
}

function createPoolRecord(data){
    var html = "";

    html += "<li class='list-group-item'>";
    html += "<div>"
    html += "<div class='heading'>";
    html += "<h4>" + data.poolName + "<span class='fa-pull-right far fa-copy copy btn' data-pool='" + data.poolAddress + "'></span></h4>";
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
    html += "<button class='btn btn-primary text-uppercase withdrawBtn' data-pool='" + data.poolAddress + "'><span class='fa fa-wallet'></span> Withdraw</button>";
    html += "</div>";
    html += "</div>";
    html += "</div>";
    html += "</li>";

    return html;
}
