$.validator.setDefaults({
    errorElement : "div",
    errorClass : "invalid-feedback",
    highlight : function(element, errorClass, validClass) {
        // Only validation controls
        if (!$(element).hasClass('novalidation')) {
            $(element).closest('.form-control').addClass('is-invalid');//.removeClass('is-valid');
        }
    },
    unhighlight : function(element, errorClass, validClass) {
        // Only validation controls
        if (!$(element).hasClass('novalidation')) {
            $(element).closest('.form-control')
                    .removeClass('is-invalid');//.addClass('is-valid');
        }
    },
    errorPlacement : function(error, element) {
        error.insertAfter(element);
    }
});	

$.validator.addMethod('SelectFormat',function(value,element){
    if(value == 0){
        return false;
    }
    else{
        return true;
    }
},'Please select an option.')