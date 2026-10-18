const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const escapeHtml = require('../../src/utils/escapeHtml');

describe('escapeHtml', () => {
    it('neutralises markup and attribute breakouts', () => {
        assert.equal(
            escapeHtml('<script>alert("x")</script> & \'q\''),
            '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39;'
        );
    });

    it('handles null, undefined and non-strings', () => {
        assert.equal(escapeHtml(null), '');
        assert.equal(escapeHtml(undefined), '');
        assert.equal(escapeHtml(42), '42');
    });
});
