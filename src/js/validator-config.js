$.validator.setDefaults({
    errorElement : "div",
    errorClass : "invalid-feedback",
    highlight : function(element, errorClass, validClass) {
        // Only validation controls
        if (!$(element).hasClass('novalidation')) {
            $(element).closest('.form-control').removeClass(
                    'is-valid').addClass('is-invalid');
        }
    },
    unhighlight : function(element, errorClass, validClass) {
        // Only validation controls
        if (!$(element).hasClass('novalidation')) {
            $(element).closest('.form-control')
                    .removeClass('is-invalid').addClass('is-valid');
        }
    },
    errorPlacement : function(error, element) {
        error.insertAfter(element);
    }
});	