App= {
    web3Provider: null,
    contracts:{},
    blockchainAddress = "http://localhost:7575",
    tokens = [],

    init:async function(){
        //Load Default Token List From JSON

        return await App.initWeb3();
    },
    unitWeb3:async function(){
        if(window.ethereum){
            App.web3Provider = window.ethereum;
            try{
                await window.ethereum.request({method:"eth_requestAccounts"});;
            }
            catch(error){
                console.error("User denied account access");
            }
        }
        else if(window.web3){
            App.web3Provider = windows.web3.currentProvider;
        }
        else{
            App.web3Provider = new Web3.providers.HttpProvider(blockchainAddress);
        }
        return App.initContract();
    },
    initContract:function(){
        //Artifact (Depolyed .sol with API)
        $.getJSON('Dex.json',function(data){
            var artifact = data;
            App.contracts.dex = TruffleContract(artifact);

            App.contracts.dex.setProvider(App.web3Provider);  
            
            return App.retrieveAddedToken();
        });
        return App.bindEvents();
    },
    bindEvents:function(){
        //SET all the event listener here

        //FOR CREATE POOL AND FUND POOl, calculate when user enter value

        //FOR WITHDRAW, after user entered amount to withdraw, calculate the value
    },
    retrieveAddedToken:function(){
        var instance;

        App.contracts.dex.deployed().then(function(ins){
            instance = ins;

            return instance.getAllToken.call();
        }).then(function(data){
            tokens = data;

            //Check External Token FROM cookie
            //If got then tokens.push();
        });
    },
    swapToken:function(tokenA,tokenB,tokenAmount){
        if(tokenA == tokenB){

        }else if(tokenAmount <= 0){

        }
        else{
            var instance;

            web3.eth.getAccounts(function(error,accounts){
                if(error){
                    console.error(error);
                }

                var account = accounts[0];

                App.contracts.dex.deployed().then(function(ins){
                    instance = ins;
                    return instance.swap(tokenA,tokenB,tokenAmount,{from:account})
                }).then(function(result){
                    //Show Result
                }).catch(function(e){
                    console.error(e.message);
                })
            })
        }
    },
    fundPool:function(tokenA,tokenB,amountA){
        if(tokenA == tokenB){

        }else if(tokenAmount <= 0){

        }
        else{

        }
    },
    addNewPool:function(tokenA,tokenB,amountA,amountB){
        if(tokenA == tokenB){

        }else if(amountA <= 0 || amountB <= 0){

        }
        else{

        }
    },
    withdrawFund:function(pool,amount){
        if(amount <= 0){

        }
        else{

        }
    },
    estWithdrawFund:function(){
        if(amount <= 0){

        }
        else{

        }
    },
    estAddNewPool:function(){
        if(tokenA == tokenB){

        }else if(amountA <= 0 || amountB <= 0){

        }
        else{

        }
    },
    estFundPool:function(){
        if(tokenA == tokenB){

        }else if(tokenAmount <= 0){

        }
        else{

        }
    },
    estSwap:function(tokenA, tokenB, amount){
        if(tokenA == tokenB){

        }else if(tokenAmount <= 0){

        }
        else{
            var instance;

            web3.eth.getAccounts(function(error,accounts){
                if(error){
                    console.error(error);
                }

                var account = accounts[0];

                App.contracts.dex.deployed().then(function(ins){
                    instance = ins;
                    return instance.swap(tokenA,tokenB,amount)
                }).then(function(result){
                    console.log(result);
                }).catch(function(e){
                    console.error(e.message);
                })
            })
        }
    }
}
