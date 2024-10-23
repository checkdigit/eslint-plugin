this rule will alert error when FullResponse is used, because it comes with problems like:

- its typing support is not as good as the latest MappedResponse
- it's often used to force cast the service response without status code assertion, which can hide potential issues
- it does work well with other agent migration rules, so needs to be resolved before the migration starts
- might be redundant when used with already typed service api
