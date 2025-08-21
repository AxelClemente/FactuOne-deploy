const forge = require('node-forge');
const fs = require('fs');

// Generar certificado de prueba
const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();

cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [{
  name: 'commonName',
  value: 'Test Certificate'
}, {
  name: 'countryName',
  value: 'ES'
}, {
  name: 'organizationName',
  value: 'Test Company'
}];

cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.sign(keys.privateKey);

// Crear PKCS12
const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
  keys.privateKey,
  cert,
  'test123',
  {generateLocalKeyId: true, friendlyName: 'test'}
);

const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
fs.writeFileSync('test-certificate.p12', Buffer.from(p12Der, 'binary'));

console.log('✅ Certificado de prueba creado: test-certificate.p12');
console.log('🔑 Contraseña: test123');