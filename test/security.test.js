import test from 'node:test';import assert from 'node:assert/strict';import {isPrivateIp,validatePublicUrl} from '../src/security.js';import {computeScores} from '../src/analyzers.js';
test('blocks private IPv4 ranges',()=>{for(const ip of ['127.0.0.1','10.0.0.1','192.168.1.1','172.16.0.1','169.254.1.1'])assert.equal(isPrivateIp(ip),true);assert.equal(isPrivateIp('1.1.1.1'),false)});
test('rejects localhost',async()=>await assert.rejects(()=>validatePublicUrl('http://localhost:3000')));
test('rejects non-web ports',async()=>await assert.rejects(()=>validatePublicUrl('https://example.com:8080')));
test('blocks IPv4-mapped private IPv6',()=>assert.equal(isPrivateIp('::ffff:127.0.0.1'),true));
test('scores deterministically',()=>{const s=computeScores([{category:'SEO',level:'critical'},{category:'SEO',level:'improvement'}],{});assert.equal(s.SEO,65);assert.ok(Number.isFinite(s['Website Health']))});
