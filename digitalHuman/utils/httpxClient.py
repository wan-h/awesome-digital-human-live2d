import httpx

# https://www.cnblogs.com/nanshaobit/p/16060370.html
asyncClient = httpx.AsyncClient(timeout=None, verify=False)