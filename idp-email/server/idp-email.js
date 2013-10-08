Keys = new Meteor.Collection('keys');

var idp_email = 'nickolai.zeldovich+idp@gmail.com';
var keys = undefined;
var debug = true;

Meteor.methods({
  request_cert: function (email, pk, origin) {
    var msg = JSON.stringify({ type: 'token',
                               email: email,
                               pk: pk,
                               origin: origin });
    var sig = base_crypto.sign(msg, keys.sign);
    var token = JSON.stringify({ msg: msg, sig: sig });
    var url = origin + encodeURIComponent(token);

    var text = 'Please click on the following link to verify your email\n' +
               'address for ' + origin + ':\n' +
               '\n' +
               url + '\n';
    Email.send({
      from: idp_email,
      to: email,
      subject: 'Email address verification',
      text: text,
    });
  },

  obtain_cert: function (token) {
    var tokenx = JSON.parse(token);
    if (!base_crypto.verify(tokenx.msg, tokenx.sig, keys.verify)) {
      console.log('obtain_cert: bad signature');
      return;
    }

    var msgx = JSON.parse(tokenx.msg);
    if (msgx.type !== 'token') {
      console.log('obtain_cert: bad msg type');
      return;
    }

    var cert_msg = JSON.stringify({ type: 'user',
                                    email: msgx.email,
                                    pk: msgx.pk,
                                    origin: msgx.origin });
    var cert_sig = base_crypto.sign(cert_msg, keys.sign);
    return { msg: cert_msg, sig: cert_sig };
  },
});

Meteor.startup(function () {
  var kdoc = Keys.findOne({});

  if (!kdoc && debug) {
    var pk = '8a7fe03431b5fc2db3923a2ab6d1a5ddf35cd64aea35e743' +
             'ded7655f0dc7e085858eeec06e1c7da58c509d57da56dbe6';
    var sk = '000000cd595558f65f7f0548fca776640ee2ad294a0d9b4d148a87';
    Keys.insert({ pk: pk, sk: sk });
    kdoc = Keys.findOne({});
  }

  if (!kdoc) {
    console.log('Did not find a saved key, generating a fresh one');
    var k = base_crypto.generate_keys();
    Keys.insert({ pk: base_crypto.serialize_public(k.verify),
                  sk: base_crypto.serialize_private(k.sign) });
    kdoc = Keys.findOne({});
  }

  keys = { verify: base_crypto.deserialize_public(kdoc.pk, 'ecdsa'),
           sign: base_crypto.deserialize_private(kdoc.sk, 'ecdsa') };
  console.log('Public key:', base_crypto.serialize_public(keys.verify));
});