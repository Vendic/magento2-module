define(
    [
        'jquery',
        'ko',
        'Magento_Customer/js/model/customer',
        'Magento_Checkout/js/model/quote',
        'Magento_Checkout/js/action/select-shipping-method',
        'Magento_Ui/js/modal/modal',
        'Magento_Checkout/js/checkout-data',
        'uiRegistry'
    ],
    function (
        $,
        ko,
        customer,
        quote,
        selectShippingMethodAction,
        modal,
        checkoutData,
        registry
    ) {
        'use strict';

        var popUp = null;
        var locatiekiezerHost = "https://login.parcelpro.nl";

        function ParcelProKiezerUrl() {
            var postcode = null;
            var street = null;

            if (window.isCustomerLoggedIn) {
                if (typeof checkoutData.getShippingAddressFromData() !== "undefined"
                    && checkoutData.getShippingAddressFromData() !== null
                    && checkoutData.getSelectedShippingAddress() == 'new-customer-address'
                ) {
                    postcode = checkoutData.getShippingAddressFromData().postcode;
                    street = checkoutData.getShippingAddressFromData().street;
                } else {
                    if (checkoutData.getSelectedShippingAddress() != null) {
                        var parts = checkoutData.getSelectedShippingAddress().split('customer-address');
                        postcode = window.customerData.addresses[(parts[1] - 1)].postcode;
                        street = window.customerData.addresses[(parts[1] - 1)].street[0];
                    } else {
                        if (window.customerData.addresses.length >= 1) {
                            postcode = window.customerData.addresses[0].postcode;
                            street = window.customerData.addresses[0].street[0];
                        } else {
                            postcode = (jQuery('input[name=postcode]').val() != '' ? jQuery('input[name=postcode]').val() : '');
                        }
                    }
                }
            } else {
                postcode = jQuery('input[name=postcode]').val();
                street = jQuery('input[name^=street]').first().val();
            }

            var url = locatiekiezerHost + "/plugin/afhaalpunt/parcelpro-kiezer.html";
            url += "?";
            url += "id=" + window.checkoutConfig.config.gebruikerID;
            url += "&postcode=" + postcode;
            url += "&adres=" + street
            url += "&origin=" + window.location.protocol + "//" + window.location.hostname;
            return url;
        }

        function popup_close() {
            jQuery('#modal').hide();
        }

        function popup_submit(data) {
            AddressIsParcelshop(data);
        }

        function AddressIsParcelshop(data) {
            if (data) {
                jQuery("#shipping_method\\:company").val(data.Id);
                jQuery("#shipping_method\\:firstname").val(data.LocationType);
                jQuery("#shipping_method\\:lastname").val(data.Name);
                jQuery("#shipping_method\\:street1").val(data.Street);
                jQuery("#shipping_method\\:street2").val(data.Housenumber + data.HousenumberAdditional);
                jQuery("#shipping_method\\:postcode").val(data.Postalcode);
                jQuery("#shipping_method\\:city").val(data.City);
                //match = /^(.*)\-(\d+)$/.exec(data.LocationTypeId);
                jQuery("#shipping_method\\:country_id").val('NL');
            }
            var firstname = jQuery("#shipping_method\\:firstname").val();
            var lastname = jQuery("#shipping_method\\:lastname").val();

            if (firstname == "DHL ParcelShop") {
                var label = jQuery('label[for="s_method_parcelpro_dhl_parcelshop"]');
                var price = jQuery('span', label);
                var priceHtml = jQuery('<div>').append(price.clone()).html();
                jQuery(label).html(firstname + " " + lastname + " <strong>" + priceHtml + "<strong>");

                return true;
            }
            if (firstname == "PostNL Pakketpunt") {
                var label = jQuery('label[for="s_method_parcelpro_postnl_pakjegemak"]');
                var price = jQuery('span', label);
                var priceHtml = jQuery('<div>').append(price.clone()).html();
                jQuery(label).html(firstname + " " + lastname + " <strong>" + priceHtml + "<strong>");
                return true;
            }
            if (firstname == "DPD ParcelShop") {
                var label = jQuery('label[for="s_method_parcelpro_dpd_parcelshop"]');
                var price = jQuery('span', label);
                var priceHtml = jQuery('<div>').append(price.clone()).html();
                jQuery(label).html(firstname + " " + lastname + " <strong>" + priceHtml + "<strong>");
                return true;
            }
            return false;
        }

        return function (Shipping) {
            return Shipping.extend({
                defaults: {
                    template: 'Parcelpro_Shipment/shipping'
                },

                initialize: function () {
                    this._super();

                    this.isFormPopUpVisible.subscribe(function (value) {
                        if (value) {
                            self.getPopUp().openModal();
                        }
                    });

                    if (window.checkoutConfig.selectedShippingMethod && (window.checkoutConfig.selectedShippingMethod.method_code == 'postnl_pakjegemak' || window.checkoutConfig.selectedShippingMethod.method_code == 'dhl_parcelshop')) {
                        checkoutData.setShippingAddressFromData(window.checkoutConfig.billingAddressFromData);
                    }

                    window.addEventListener("message", function (event) {
                        if (event.origin === locatiekiezerHost) {
                            var msg = event.data;
                            if (msg == "closewindow") {
                                popup_close();
                            } else {
                                AddressIsParcelshop(msg);
                                popup_close();
                            }
                        } else {
                            console.log(event.origin + "!== " + locatiekiezerHost);
                        }
                    }, false);
                },

                isSelected: ko.computed(function () {
                        // Parcel Pro Afhaalpunt
                        if ($('#modal').is(':visible')) return false;
                        var postcode = null;
                        var street = null;

                        if (customer.isLoggedIn()) {
                            if (typeof checkoutData.getShippingAddressFromData() !== "undefined"
                                && checkoutData.getShippingAddressFromData() !== null) {
                                postcode = checkoutData.getShippingAddressFromData().postcode;
                                street = checkoutData.getShippingAddressFromData().street;
                            } else if (customer.isLoggedIn()) {
                                if (customer.customerData.addresses.length >= 1) {
                                    postcode = customer.customerData.addresses[0].postcode;
                                    street = customer.customerData.addresses[0].street[0];
                                }
                            }
                        }

                        return quote.shippingMethod()
                            ? quote.shippingMethod().carrier_code + '_' + quote.shippingMethod().method_code
                            : null;
                    }
                ),

                selectShippingMethod: function (shippingMethod) {
                    selectShippingMethodAction(shippingMethod);
                    checkoutData.setSelectedShippingRate(shippingMethod.carrier_code + '_' + shippingMethod.method_code);
                    if (shippingMethod.method_code == "postnl_pakjegemak") {
                        jQuery('#modal').show();
                        jQuery('#afhaalpunt_frame').attr('src', ParcelProKiezerUrl() + '&carrier=PostNL');
                    }
                    if (shippingMethod.method_code == "dhl_parcelshop") {
                        jQuery('#modal').show();
                        jQuery('#afhaalpunt_frame').attr('src', ParcelProKiezerUrl() + '&carrier=DHL');
                    }
                    if (shippingMethod.method_code == "dpd_parcelshop") {
                        jQuery('#modal').show();
                        jQuery('#afhaalpunt_frame').attr('src', ParcelProKiezerUrl() + '&carrier=DPD');
                    }
                    return true;
                },

                validateShippingInformation: function () {
                    var result;
                    if (quote.shippingMethod()) {
                        if (quote.shippingMethod().method_code == "postnl_pakjegemak" || quote.shippingMethod().method_code == "dhl_parcelshop" || quote.shippingMethod().method_code == "dpd_parcelshop") {
                            if (jQuery("#shipping_method\\:company").val() === "") {
                                this.errorValidationMessage('Selecteer een afhaallocatie of een andere verzendmethode');
                                return false;
                            }
                        }
                    }

                    return this._super();
                },
            });
        };
    }
);
