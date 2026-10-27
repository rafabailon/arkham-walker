.PHONY: test serve clean

test:
	python3 -B -m unittest discover -s tests -v

serve:
	python3 -m http.server 8000

clean:
	rm -rf __pycache__ tests/__pycache__
