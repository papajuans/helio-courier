deploy:
	@# thx stack lol
	@# http://stackoverflow.com/questions/2111042/how-to-get-the-name-of-the-current-git-branch-into-a-variable-in-a-shell-script#2111099
	@echo '⚡⚡⚡ Sanity testing code...'
	@npm test
	@echo
	@echo '⚡⚡⚡ Force pushing current branch to heroku master...'
	@echo
	@git push --force heroku $$(git branch | sed -n -e 's/^\* \(.*\)/\1/p'):master
	@heroku logs -t

tail:
	@heroku logs -t

logs:
	@heroku logs -t
