Serializing objects with `JSON.stringify()` can lose information for certain data payloads.
For example, an instance of Error will result in empty output like `{}` because it's properties are not enumerable.

This rule disallows serializing such objects with potential issues by matching the name of the first parameter passed to JSON.stringify() with a Regexp pattern.
