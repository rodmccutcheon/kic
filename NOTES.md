# Notes

## Assumptions
<!-- What assumptions did you make that aren't stated in the brief? -->

For the build vs buy question I've made some assumptions:
* Segment, Rudderstack and mParticle will be too expensive given the volume of events now and in the future
* There are no long term contracts in place with Segment
* The team has the knowledge and capacity to implement a custom platform
* The business is happy to trade-off the time-to-value in favour of having more control over the way merges, conflicts and reversibility is handled

## Tradeoffs
<!-- What did you consciously trade off or simplify, and why? -->

* I implemented a simple utility function to standardise phone numbers to E.164 format. For more exhaustive parsing something like https://www.npmjs.com/package/libphonenumber-js could be used.

## What I'd do differently with more time
<!-- What would change with a full production timeline? -->

* At the moment my solution handles collisions by short circuiting, i.e. the higher signal strenth/precedence wins out. Given more time I would match on both and build a UI around it for someone to manually review the matches.
* Introduce schema versioning for the webhook payloads
* Add frontend tests
* Introduce event queues which would enable retries (with exponential backoff), and dead-letter queues to store failed delivery attempts for manual investigation.
* Expand the UI to enable manual merging of users with conflicting or lower confidence signals. Additionally, I would allow the ability to reverse a merge.
* Introduce logging and alerting to make the system observable.

## Anything else
<!-- Anything you'd like us to know -->

* Could consider doing some AI matching/confidence score for probabilistic matches