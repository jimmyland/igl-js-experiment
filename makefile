# usr local bin exported for emcc because I couldn't find the setting in xcode to make it include /usr/local/bin in its path when running make; todo remove the export stuff later
CC=emcc
SOURCES:=$(wildcard *.cpp)
LDFLAGS=
O2_LDFLAGS=-s FORCE_FILESYSTEM=1 -O2 --llvm-opts 2 
INCLUDEFLAGS=-Iexternal/libigl/external/eigen -Iexternal/libigl/include
OUTPUT=iglwrap.js

all: $(SOURCES) $(OUTPUT)

$(OUTPUT): $(SOURCES)
	$(CC) $(SOURCES) $(INCLUDEFLAGS) --bind -s WASM=0 -s ALLOW_MEMORY_GROWTH=1 -s NO_EXIT_RUNTIME=1 -s ASSERTIONS=1 -s DEMANGLE_SUPPORT=1 -std=c++11 $(O2_LDFLAGS) -o $(OUTPUT)

.PHONY: clean all
clean:
	rm $(OUTPUT) $(OUTPUT).mem
