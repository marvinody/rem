import axios from 'axios'
import {IExtractor, SearchParams} from './IExtractor'

const {MERCARI_SEARCH_DPOP} = process.env

export default class Mercari implements IExtractor {
  isEnabled() {
    return Boolean(MERCARI_SEARCH_DPOP)
  }

  search({page, query}: SearchParams) {

  }
}
