import logging
import os
from datetime import datetime
import sys
import traceback

# Config logging

class pasLogger(object):
    def __init__(self):

        self.logger = self._makeLogger()

    def _makeLogger(self):

        logger = logging.getLogger(__name__)
        logger.setLevel(logging.DEBUG)
        f_handler = logging.FileHandler(f'{os.path.dirname(__file__)}/log/{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
        f_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        f_handler.setFormatter(f_format)
        logger.addHandler(f_handler)

        return logger


# Logging config for any uncaught exceptions
logobj = pasLogger()

def except_handler(type, value, tb):
    logobj.logger.exception(f'{traceback.format_tb(tb)}')

sys.excepthook = except_handler
